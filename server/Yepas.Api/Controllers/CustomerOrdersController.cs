using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;
using Yepas.Api.Domain;
using Yepas.Api.Models;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/customer/branches")]
    public sealed class CustomerOrdersController : ApiController
    {
        [HttpGet]
        [Route("{legacyMbId:int}/order")]
        public HttpResponseMessage Get(int legacyMbId)
        {
            if (legacyMbId <= 0) return Request.CreateResponse(HttpStatusCode.BadRequest);
            try
            {
                var repository = new AuthRepository();
                var identity = repository.Authenticate(AuthController.CurrentToken(), "CUSTOMER");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                if (!repository.UserCanAccessCustomer(identity.UserId, legacyMbId))
                    return Request.CreateResponse(HttpStatusCode.Forbidden);
                var context = new CustomerOrderService().GetContext(legacyMbId);
                if (context == null) return Request.CreateResponse(HttpStatusCode.NotFound);
                return Request.CreateResponse(HttpStatusCode.OK, context);
            }
            catch (InvalidOperationException exception)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "SCHEDULE_UNAVAILABLE", message = exception.Message });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "ORDER_UNAVAILABLE", message = "Sipariş bilgisine erişilemiyor." });
            }
        }

        [HttpPut]
        [Route("{legacyMbId:int}/order")]
        public HttpResponseMessage Put(int legacyMbId, SaveCustomerOrderRequest input)
        {
            if (HttpContext.Current == null || !AuthController.PermittedOrigin(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            if (legacyMbId <= 0) return Request.CreateResponse(HttpStatusCode.BadRequest);

            try
            {
                var repository = new AuthRepository();
                var identity = repository.Authenticate(AuthController.CurrentToken(), "CUSTOMER");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                if (!repository.UserCanAccessCustomer(identity.UserId, legacyMbId))
                    return Request.CreateResponse(HttpStatusCode.Forbidden);

                var keys = Request.Headers.Contains("Idempotency-Key")
                    ? Request.Headers.GetValues("Idempotency-Key").ToList() : new List<string>();
                if (keys.Count != 1)
                    return Request.CreateResponse(HttpStatusCode.BadRequest,
                        new { code = "IDEMPOTENCY_REQUIRED", message = "Idempotency-Key başlığı zorunludur." });

                var order = new CustomerOrderService().Save(identity.UserId, legacyMbId, input, keys[0]);
                return Request.CreateResponse(HttpStatusCode.OK, order);
            }
            catch (ArgumentException exception)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest,
                    new { code = "INVALID_ORDER", message = exception.Message });
            }
            catch (KeyNotFoundException)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }
            catch (OrderWindowClosedException)
            {
                return Request.CreateResponse(HttpStatusCode.Conflict,
                    new { code = "ORDER_WINDOW_CLOSED", message = "Sipariş penceresi kapalı." });
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
                    new { code = "ORDER_UNAVAILABLE", message = "Sipariş kaydedilemiyor." });
            }
        }
    }
}
