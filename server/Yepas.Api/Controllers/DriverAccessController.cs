using System;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    public sealed class DriverAccessRequest
    {
        public bool? Enabled { get; set; }
    }

    [RoutePrefix("api/v1/admin/drivers")]
    public sealed class DriverAccessController : ApiController
    {
        [HttpPost]
        [Route("{personnelId:int}/login-access")]
        public HttpResponseMessage SetLoginAccess(int personnelId, DriverAccessRequest input)
        {
            if (HttpContext.Current == null || !AuthController.PermittedOrigin(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            if (input == null || !input.Enabled.HasValue || personnelId <= 0)
                return Request.CreateResponse(HttpStatusCode.BadRequest);

            try
            {
                var identity = new AuthRepository().Authenticate(AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                if (!new AuthRepository().SetDriverAccess(personnelId, input.Enabled.Value))
                    return Request.CreateResponse(HttpStatusCode.NotFound);
                return Request.CreateResponse(HttpStatusCode.OK,
                    new { personnelId = personnelId, enabled = input.Enabled.Value });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "ACCESS_UNAVAILABLE", message = "Şoför giriş izni değiştirilemedi." });
            }
        }
    }
}
