using System;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/admin/order-settings")]
    public sealed class OrderSettingsController : ApiController
    {
        [HttpGet]
        [Route("")]
        public HttpResponseMessage Get()
        {
            try
            {
                var identity = new AuthRepository().Authenticate(AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                return Request.CreateResponse(HttpStatusCode.OK, new OrderRepository().ReadSettingsView());
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "SETTINGS_UNAVAILABLE", message = "Sipariş ayarlarına erişilemiyor." });
            }
        }

        [HttpPut]
        [Route("")]
        public HttpResponseMessage Put(UpdateOrderSettingsRequest input)
        {
            if (HttpContext.Current == null || !AuthController.PermittedOrigin(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            try
            {
                var identity = new AuthRepository().Authenticate(AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                if (input == null) return Request.CreateResponse(HttpStatusCode.BadRequest);

                DateTime cutoff;
                if (!DateTime.TryParseExact(input.CutoffTime, "HH:mm", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out cutoff))
                    return Request.CreateResponse(HttpStatusCode.BadRequest,
                        new { code = "INVALID_CUTOFF", message = "Saat HH:mm biçiminde olmalıdır." });
                var mode = String.IsNullOrWhiteSpace(input.OverrideMode)
                    ? "AUTO" : input.OverrideMode.Trim().ToUpperInvariant();
                if (mode != "AUTO" && mode != "OPEN" && mode != "CLOSED")
                    return Request.CreateResponse(HttpStatusCode.BadRequest,
                        new { code = "INVALID_MODE", message = "Geçersiz manuel durum." });
                if (mode != "AUTO" && String.IsNullOrWhiteSpace(input.Reason))
                    return Request.CreateResponse(HttpStatusCode.BadRequest,
                        new { code = "REASON_REQUIRED", message = "Manuel işlem gerekçesi zorunludur." });
                if (input.Reason != null && input.Reason.Length > 300)
                    return Request.CreateResponse(HttpStatusCode.BadRequest);

                var until = input.OverrideUntilUtc;
                if (until.HasValue && until.Value.Kind != DateTimeKind.Utc)
                    until = until.Value.ToUniversalTime();
                var view = new OrderRepository().UpdateSettings(identity.UserId,
                    cutoff.Hour * 60 + cutoff.Minute, mode, mode == "AUTO" ? null : until, input.Reason);
                return Request.CreateResponse(HttpStatusCode.OK, view);
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "SETTINGS_UNAVAILABLE", message = "Sipariş ayarları güncellenemiyor." });
            }
        }
    }
}
