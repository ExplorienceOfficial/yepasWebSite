using System;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
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
            var allowed = RuntimeSettings.DevelopmentMode && IsLocalDevelopmentOrigin(origin);
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

        private static bool IsLocalDevelopmentOrigin(string origin)
        {
            Uri uri;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out uri) ||
                uri.Scheme != Uri.UriSchemeHttp || uri.Port != 3000)
                return false;

            if (String.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)) return true;

            IPAddress address;
            if (!IPAddress.TryParse(uri.Host, out address)) return false;
            if (IPAddress.IsLoopback(address)) return true;

            try
            {
                foreach (var localAddress in Dns.GetHostEntry(Dns.GetHostName()).AddressList)
                {
                    if (localAddress.AddressFamily == AddressFamily.InterNetwork && localAddress.Equals(address))
                        return true;
                }
            }
            catch (SocketException) { return false; }

            return false;
        }
    }
}
