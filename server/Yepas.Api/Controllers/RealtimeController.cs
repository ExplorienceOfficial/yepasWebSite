using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Yepas.Api.Data;
using Yepas.RealtimeSecurity;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/admin/realtime")]
    public sealed class RealtimeController : ApiController
    {
        [HttpGet, Route("ticket")]
        public HttpResponseMessage Ticket()
        {
            try
            {
                var identity = new AuthRepository().Authenticate(AuthController.CurrentToken(), "ADMIN");
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
                Uri hub;
                if (!Uri.TryCreate(ConfigurationManager.AppSettings["YepasRealtimeHubUrl"], UriKind.Absolute, out hub) ||
                    hub.Scheme != "https" || hub.AbsolutePath != "/hubs/orders" ||
                    !String.IsNullOrEmpty(hub.Query) || !String.IsNullOrEmpty(hub.UserInfo))
                    throw new InvalidOperationException("Realtime HTTPS hub is not configured.");
                var key = RealtimeTicket.ReadKey(ConfigurationManager.AppSettings["YepasRealtimeKey"]);
                DateTime databaseUtcNow;
                new OrderRepository().ReadSettings(out databaseUtcNow);
                var response = Request.CreateResponse(HttpStatusCode.OK, new {
                    hubUrl = hub.AbsoluteUri,
                    accessToken = RealtimeTicket.Issue(key, "admin", identity.UserId, databaseUtcNow, 300)
                });
                response.Headers.CacheControl = new System.Net.Http.Headers.CacheControlHeaderValue { NoStore = true };
                return response;
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "REALTIME_UNAVAILABLE", message = "Canlı bağlantı şu anda kullanılamıyor." });
            }
        }
    }
}
