using System;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/admin/orders")]
    public sealed class AdminOrdersController : ApiController
    {
        [HttpGet]
        [Route("")]
        public HttpResponseMessage Get(string scope = "submitted")
        {
            try
            {
                var identity = new AuthRepository().Authenticate(
                    AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                return Request.CreateResponse(HttpStatusCode.OK,
                    new AdminOrderBoardRepository().Read(scope));
            }
            catch (ArgumentException exception)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,
                    new { code = "INVALID_ORDER_SCOPE", message = exception.Message });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "ADMIN_ORDERS_UNAVAILABLE",
                          message = "Sipariş listesine erişilemiyor." });
            }
        }
    }
}
