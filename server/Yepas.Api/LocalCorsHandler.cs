using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Yepas.Api
{
    public sealed class LocalCorsHandler : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var origin = request.Headers.Contains("Origin")
                ? String.Join("", request.Headers.GetValues("Origin")) : null;
            var allowed = false;
            allowed = RuntimeSettings.DevelopmentMode && request.RequestUri.IsLoopback &&
                (origin == "http://127.0.0.1:3000" || origin == "http://localhost:3000");
            HttpResponseMessage response;
            if (request.Method == HttpMethod.Options)
                response = new HttpResponseMessage(allowed ? HttpStatusCode.NoContent : HttpStatusCode.Forbidden);
            else
                response = await base.SendAsync(request, cancellationToken);

            if (allowed)
            {
                response.Headers.Add("Access-Control-Allow-Origin", origin);
                response.Headers.Add("Access-Control-Allow-Credentials", "true");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
                response.Headers.Add("Vary", "Origin");
            }
            response.Headers.CacheControl = new System.Net.Http.Headers.CacheControlHeaderValue { NoStore = true };
            return response;
        }
    }
}
