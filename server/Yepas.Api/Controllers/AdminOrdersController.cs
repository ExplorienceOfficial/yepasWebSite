using System;
using System.Net;
using System.Net.Http;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;
using Yepas.Api.Domain;
using Yepas.Api.Models;

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

        [HttpGet]
        [Route("{legacyMbId:int}/context")]
        public HttpResponseMessage GetContext(int legacyMbId)
        {
            if (legacyMbId <= 0) return Request.CreateResponse(HttpStatusCode.BadRequest);
            try
            {
                var identity = new AuthRepository().Authenticate(
                    AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                var context = new CustomerOrderService().GetAdminContext(legacyMbId);
                return context == null ? Request.CreateResponse(HttpStatusCode.NotFound) :
                    Request.CreateResponse(HttpStatusCode.OK, context);
            }
            catch (ArgumentException exception)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,
                    new { code = "INVALID_ADMIN_ORDER", message = exception.Message });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "ADMIN_ORDER_UNAVAILABLE", message = "Sipariş bilgisine erişilemiyor." });
            }
        }

        [HttpPut]
        [Route("{legacyMbId:int}")]
        public HttpResponseMessage Put(int legacyMbId, SaveCustomerOrderRequest input)
        {
            if (HttpContext.Current == null ||
                !AuthController.PermittedWriteRequest(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            if (legacyMbId <= 0) return Request.CreateResponse(HttpStatusCode.BadRequest);
            try
            {
                var identity = new AuthRepository().Authenticate(
                    AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                var keys = Request.Headers.Contains("Idempotency-Key")
                    ? Request.Headers.GetValues("Idempotency-Key").ToList() : new List<string>();
                if (keys.Count != 1)
                    return Request.CreateResponse(HttpStatusCode.BadRequest,
                        new { code = "IDEMPOTENCY_REQUIRED", message = "Idempotency-Key başlığı zorunludur." });
                return Request.CreateResponse(HttpStatusCode.OK,
                    new CustomerOrderService().SaveAdmin(identity.UserId, legacyMbId, input, keys[0]));
            }
            catch (ArgumentException exception)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,
                    new { code = "INVALID_ADMIN_ORDER", message = exception.Message });
            }
            catch (KeyNotFoundException)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }
            catch (OrderRevisionConflictException)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "ORDER_REVISION_CONFLICT", message = "Sipariş güncellendi; son halini yenileyin." });
            }
            catch (IdempotencyConflictException)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "IDEMPOTENCY_CONFLICT", message = "İstek anahtarı daha önce farklı içerikle kullanıldı." });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "ADMIN_ORDER_UNAVAILABLE", message = "Sipariş kaydedilemiyor." });
            }
        }

        [HttpPost]
        [Route("finalize")]
        public HttpResponseMessage FinalizeOrders()
        {
            if (HttpContext.Current == null ||
                !AuthController.PermittedWriteRequest(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            try
            {
                var identity = new AuthRepository().Authenticate(
                    AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                return Request.CreateResponse(HttpStatusCode.OK,
                    new OrderFinalizationService().Finalize(identity.UserId));
            }
            catch (OrderStillOpenException exception)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "ORDER_WINDOW_OPEN", message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "FINALIZATION_INVALID", message = exception.Message });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "FINALIZATION_FAILED",
                          message = "Siparişler eski sisteme aktarılamadı; güvenle tekrar deneyebilirsiniz." });
            }
        }
    }
}
