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
    [RoutePrefix("api/v1/admin/customers")]
    public sealed class CustomerManagementController : ApiController
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
                    new CustomerManagementRepository().ReadCustomers());
            }
            catch (Exception)
            {
                return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                    new { code = "CUSTOMERS_UNAVAILABLE", message = "Müşteri listesine erişilemiyor." });
            }
        }

        [HttpPost]
        [Route("accounts")]
        public HttpResponseMessage CreateAccount(CreateCustomerAccountRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            try
            {
                var account = new CustomerManagementRepository().CreateAccount(identity.UserId,
                    input == null ? null : input.LoginName,
                    input == null ? null : input.TemporaryPassword,
                    input == null ? null : input.LegacyMbIds);
                return Request.CreateResponse(HttpStatusCode.Created, account);
            }
            catch (ArgumentException exception) { return Invalid(exception.Message); }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (InvalidOperationException exception) { return Conflict(exception.Message); }
            catch (SqlException exception)
            {
                if (exception.Number == 2601 || exception.Number == 2627)
                    return Conflict("Kullanıcı adı veya seçilen şubeler zaten kullanılıyor.");
                return Unavailable();
            }
            catch (Exception) { return Unavailable(); }
        }

        [HttpPut]
        [Route("accounts/{userId:int}/branches")]
        public HttpResponseMessage ReplaceBranches(int userId, ReplaceCustomerBranchesRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            try
            {
                new CustomerManagementRepository().ReplaceBranches(identity.UserId, userId,
                    input == null ? null : input.LegacyMbIds);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (ArgumentException exception) { return Invalid(exception.Message); }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (InvalidOperationException exception) { return Conflict(exception.Message); }
            catch (Exception) { return Unavailable(); }
        }

        [HttpPut]
        [Route("accounts/{userId:int}/status")]
        public HttpResponseMessage SetStatus(int userId, SetCustomerAccountStatusRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            if (input == null) return Request.CreateResponse(HttpStatusCode.BadRequest);
            try
            {
                new CustomerManagementRepository().SetStatus(identity.UserId, userId, input.Enabled);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (Exception) { return Unavailable(); }
        }

        [HttpPost]
        [Route("accounts/{userId:int}/reset-password")]
        public HttpResponseMessage ResetPassword(int userId, ResetCustomerPasswordRequest input)
        {
            HttpResponseMessage rejected;
            var identity = WriteAdmin(out rejected);
            if (identity == null) return rejected;
            try
            {
                new CustomerManagementRepository().ResetPassword(identity.UserId, userId,
                    input == null ? null : input.TemporaryPassword);
                return Request.CreateResponse(HttpStatusCode.NoContent);
            }
            catch (ArgumentException exception) { return Invalid(exception.Message); }
            catch (KeyNotFoundException exception) { return NotFoundMessage(exception.Message); }
            catch (Exception) { return Unavailable(); }
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
                new { code = "INVALID_CUSTOMER_ACCOUNT", message = message });
        }

        private HttpResponseMessage Conflict(string message)
        {
            return Request.CreateResponse(HttpStatusCode.Conflict,
                new { code = "CUSTOMER_ACCOUNT_CONFLICT", message = message });
        }

        private HttpResponseMessage NotFoundMessage(string message)
        {
            return Request.CreateResponse(HttpStatusCode.NotFound,
                new { code = "CUSTOMER_NOT_FOUND", message = message });
        }

        private HttpResponseMessage Unavailable()
        {
            return Request.CreateResponse(HttpStatusCode.ServiceUnavailable,
                new { code = "CUSTOMER_ACCOUNT_UNAVAILABLE", message = "Müşteri hesabı kaydedilemiyor." });
        }
    }
}
