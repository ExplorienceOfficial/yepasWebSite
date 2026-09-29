using System;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    /// <summary>
    /// Giriş öncesi okunabilen tek uç: mobil uygulama sistemin açık mı kapalı mı
    /// olduğunu buradan öğrenir ve kapalıyken giriş düğmesi yerine "Sistem kapalı"
    /// gösterir. Kimlik bilgisi veya sipariş verisi döndürmez.
    /// </summary>
    [RoutePrefix("api/v1/system")]
    public sealed class SystemStatusController : ApiController
    {
        [HttpGet]
        [Route("status")]
        public HttpResponseMessage Get()
        {
            try
            {
                var settings = new OrderRepository().ReadSettingsView();
                return Request.CreateResponse(HttpStatusCode.OK, new {
                    isOpen = settings.IsOpen,
                    cutoffTime = settings.CutoffTime,
                    cutoffMinute = settings.CutoffMinute,
                    serverNowUtc = settings.ServerNowUtc
                });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "SYSTEM_STATUS_UNAVAILABLE",
                          message = "Sistem durumuna erişilemiyor." });
            }
        }
    }
}
