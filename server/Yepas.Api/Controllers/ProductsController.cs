using System;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/admin/products")]
    public sealed class ProductsController : ApiController
    {
        [HttpGet]
        [Route("")]
        public HttpResponseMessage Get()
        {
            try
            {
                var cookie = HttpContext.Current == null ? null :
                    HttpContext.Current.Request.Cookies[AuthRepository.SessionCookieName];
                var token = cookie == null ? null : cookie.Value;
                if (new AuthRepository().Authenticate(token, "ADMIN") == null)
                    return Request.CreateResponse(HttpStatusCode.Unauthorized);
                var response = Request.CreateResponse(HttpStatusCode.OK, new ProductCatalogReader().Read());
                response.Headers.CacheControl = new System.Net.Http.Headers.CacheControlHeaderValue
                {
                    NoStore = true
                };
                return response;
            }
            catch (Exception)
            {
                // Do not expose SQL details to the browser.
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "CATALOG_UNAVAILABLE", message = "Ürün kataloğuna erişilemiyor." });
            }
        }
    }
}
