using System;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/driver/routes")]
    public sealed class DriverRoutesController : ApiController
    {
        [HttpGet]
        [Route("")]
        public HttpResponseMessage Get(string scope = "delivery")
        {
            try
            {
                var identity = new AuthRepository().Authenticate(
                    AuthController.CurrentToken(), "DRIVER");
                if (identity == null || !identity.LegacyPersonnelId.HasValue)
                    return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword)
                    return Request.CreateResponse(HttpStatusCode.Forbidden,
                        new { code = "PASSWORD_CHANGE_REQUIRED",
                              message = "Önce geçici parolanızı değiştirin." });
                return Request.CreateResponse(HttpStatusCode.OK,
                    new DriverRouteRepository().Read(identity.LegacyPersonnelId.Value, scope));
            }
            catch (ArgumentException exception)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,
                    new { code = "INVALID_ROUTE_SCOPE", message = exception.Message });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "DRIVER_ROUTE_UNAVAILABLE",
                          message = "Şoför rota ve sipariş bilgilerine erişilemiyor." });
            }
        }
    }
}
