using System;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;

namespace Yepas.Api.Controllers
{
    public sealed class LoginRequest
    {
        public string LoginName { get; set; }
        public string Password { get; set; }
        public string Role { get; set; }
    }

    [RoutePrefix("api/v1/auth")]
    public sealed class AuthController : ApiController
    {
        internal static bool PermittedOrigin(HttpRequest request)
        {
            var origin = request.Headers["Origin"];
            if (String.IsNullOrWhiteSpace(origin)) return false;
            var ownOrigin = request.Url.GetLeftPart(UriPartial.Authority);
            if (String.Equals(origin, ownOrigin, StringComparison.OrdinalIgnoreCase)) return true;
            return RuntimeSettings.DevelopmentMode && request.IsLocal &&
                (origin == "http://127.0.0.1:3000" || origin == "http://localhost:3000");
        }

        private static void SetSessionCookie(string value, bool delete)
        {
            var cookie = new HttpCookie(AuthRepository.SessionCookieName, value) {
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Secure = RuntimeSettings.DevelopmentMode
                    ? HttpContext.Current.Request.IsSecureConnection
                    : true
            };
            if (delete) cookie.Expires = DateTime.UtcNow.AddDays(-1);
            HttpContext.Current.Response.Cookies.Add(cookie);
        }

        internal static string CurrentToken()
        {
            var cookie = HttpContext.Current.Request.Cookies[AuthRepository.SessionCookieName];
            return cookie == null ? null : cookie.Value;
        }

        [HttpPost]
        [Route("login")]
        public HttpResponseMessage Login(LoginRequest input)
        {
            if (HttpContext.Current == null || !PermittedOrigin(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            if (input == null || String.IsNullOrWhiteSpace(input.LoginName) ||
                String.IsNullOrEmpty(input.Password) || String.IsNullOrWhiteSpace(input.Role))
                return Request.CreateResponse(HttpStatusCode.BadRequest);

            if (!RuntimeSettings.DevelopmentMode && !HttpContext.Current.Request.IsSecureConnection)
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            try
            {
                string token;
                var identity = new AuthRepository().Login(input.LoginName, input.Password,
                    input.Role.Trim().ToUpperInvariant(), out token);
                if (identity == null)
                    return Request.CreateResponse(HttpStatusCode.Unauthorized,
                        new { code = "INVALID_LOGIN", message = "Kullanıcı adı veya parola hatalı ya da hesap kapalı." });
                SetSessionCookie(token, false);
                return Request.CreateResponse(HttpStatusCode.OK,
                    new { userId = identity.UserId, loginName = identity.LoginName,
                          role = identity.Role, mustChangePassword = identity.MustChangePassword });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "AUTH_UNAVAILABLE", message = "Giriş hizmetine erişilemiyor." });
            }
        }

        [HttpGet]
        [Route("me")]
        public HttpResponseMessage Me()
        {
            try
            {
                var identity = new AuthRepository().Authenticate(CurrentToken(), null);
                if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
                return Request.CreateResponse(HttpStatusCode.OK,
                    new { userId = identity.UserId, loginName = identity.LoginName,
                          role = identity.Role, mustChangePassword = identity.MustChangePassword });
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "AUTH_UNAVAILABLE", message = "Oturum doğrulanamıyor." });
            }
        }

        [HttpPost]
        [Route("logout")]
        public HttpResponseMessage Logout()
        {
            if (HttpContext.Current == null || !PermittedOrigin(HttpContext.Current.Request))
                return Request.CreateResponse(HttpStatusCode.Forbidden);
            try
            {
                new AuthRepository().Revoke(CurrentToken());
                SetSessionCookie(String.Empty, true);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "AUTH_UNAVAILABLE", message = "Çıkış işlemi tamamlanamadı." });
            }
        }
    }
}
