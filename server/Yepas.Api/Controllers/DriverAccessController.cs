using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Controllers
{
    [RoutePrefix("api/v1/admin/drivers")]
    public sealed class DriverAccessController : ApiController
    {
        [HttpGet]
        [Route("")]
        public HttpResponseMessage Get()
        {
            var identity = ReadAdmin();
            if (identity == null) return Request.CreateResponse(HttpStatusCode.Unauthorized);
            if (identity.MustChangePassword) return Request.CreateResponse(HttpStatusCode.Forbidden);
            try
            {
                return Request.CreateResponse(HttpStatusCode.OK,
                    new DriverManagementRepository().ReadDrivers());
            }
            catch (Exception) { return Unavailable("Şoför listesine erişilemiyor."); }
        }

        [HttpPost]
        [Route("{personnelId:int}/account")]
        public HttpResponseMessage CreateAccount(int personnelId, CreateDriverAccountRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            try
            {
                var account = new DriverManagementRepository().CreateAccount(identity.UserId,
                    personnelId, input == null ? null : input.LoginName,
                    input == null ? null : input.TemporaryPassword);
                return Request.CreateResponse(HttpStatusCode.Created, account);
            }
            catch (ArgumentException exception) { return Invalid(exception.Message); }
            catch (InvalidOperationException exception) { return Conflict(exception.Message); }
            catch (SqlException exception)
            {
                if (exception.Number == 2601 || exception.Number == 2627)
                    return Conflict("Kullanıcı adı veya şoför hesabı zaten kullanılıyor.");
                return Unavailable("Şoför hesabı oluşturulamıyor.");
            }
            catch (Exception) { return Unavailable("Şoför hesabı oluşturulamıyor."); }
        }

        [HttpPut]
        [Route("accounts/{userId:int}/status")]
        public HttpResponseMessage SetStatus(int userId, SetDriverAccountStatusRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            if (input == null) return Request.CreateResponse(HttpStatusCode.BadRequest);
            try
            {
                new DriverManagementRepository().SetStatus(identity.UserId, userId, input.Enabled);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (InvalidOperationException exception) { return Conflict(exception.Message); }
            catch (Exception) { return Unavailable("Şoför hesabı güncellenemiyor."); }
        }

        [HttpPost]
        [Route("accounts/{userId:int}/reset-password")]
        public HttpResponseMessage ResetPassword(int userId, ResetDriverPasswordRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            try
            {
                new DriverManagementRepository().ResetPassword(identity.UserId, userId,
                    input == null ? null : input.TemporaryPassword);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (ArgumentException exception) { return Invalid(exception.Message); }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (Exception) { return Unavailable("Şoför parolası yenilenemiyor."); }
        }

        private static AuthIdentity ReadAdmin()
        {
            try { return new AuthRepository().Authenticate(AuthController.CurrentToken(), "ADMIN"); }
            catch { return null; }
        }

        private AuthIdentity WriteAdmin(out HttpResponseMessage rejected)
        {
            rejected = null;
            if (HttpContext.Current == null || !AuthController.PermittedOrigin(HttpContext.Current.Request))
            {
                rejected = Request.CreateResponse(HttpStatusCode.Forbidden);
                return null;
            }
            var identity = ReadAdmin();
            if (identity == null) rejected = Request.CreateResponse(HttpStatusCode.Unauthorized);
            else if (identity.MustChangePassword) rejected = Request.CreateResponse(HttpStatusCode.Forbidden);
            return rejected == null ? identity : null;
        }

        private HttpResponseMessage Invalid(string message)
        {
            return Request.CreateResponse(HttpStatusCode.BadRequest,
                new { code = "INVALID_DRIVER_ACCOUNT", message = message });
        }

        private HttpResponseMessage Conflict(string message)
        {
            return Request.CreateResponse(HttpStatusCode.Conflict,
                new { code = "DRIVER_ACCOUNT_CONFLICT", message = message });
        }

        private HttpResponseMessage NotFoundMessage(string message)
        {
            return Request.CreateResponse(HttpStatusCode.NotFound,
                new { code = "DRIVER_NOT_FOUND", message = message });
        }

        private HttpResponseMessage Unavailable(string message)
        {
            return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                new { code = "DRIVER_ACCOUNT_UNAVAILABLE", message = message });
        }
    }
}
