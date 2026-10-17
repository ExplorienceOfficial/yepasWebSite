using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Yepas.RealtimeSecurity;

public sealed class TicketAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly RealtimeOptions realtime;
    public TicketAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder, RealtimeOptions realtime)
        : base(options, logger, encoder) { this.realtime = realtime; }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments("/hubs/orders"))
            return Task.FromResult(AuthenticateResult.NoResult());
        var tokens = Request.Query["access_token"];
        if (tokens.Count != 1 || !RealtimeTicket.Validate(realtime.Key, tokens[0] ?? "", "admin",
            DateTime.UtcNow, out var id, out var expiry, out _))
            return Task.FromResult(AuthenticateResult.Fail("Invalid realtime ticket."));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.NameIdentifier, id.ToString(CultureInfo.InvariantCulture)),
            new Claim(ClaimTypes.Role, "ADMIN")
        }, Scheme.Name));
        var properties = new AuthenticationProperties { ExpiresUtc = new DateTimeOffset(expiry) };
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, properties, Scheme.Name)));
    }
}
