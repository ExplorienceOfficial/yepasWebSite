using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR;
using Yepas.RealtimeSecurity;

var builder = WebApplication.CreateBuilder(args);
// Query-string tickets must never appear in request logs.
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
var key = RealtimeTicket.ReadKey(builder.Configuration["Yepas:RealtimeKey"] ?? "");
var origins = (builder.Configuration["Yepas:AllowedOrigins"] ?? "")
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (origins.Length == 0 || origins.Any(x => !Uri.TryCreate(x, UriKind.Absolute, out var uri) ||
    uri.Scheme != "https" || uri.GetLeftPart(UriPartial.Authority) != x))
    throw new InvalidOperationException("Configure exact HTTPS admin origins; wildcards are forbidden.");
builder.Services.AddSingleton(new RealtimeOptions(key, origins));
builder.Services.AddSingleton<PublishReplayGuard>();
builder.Services.AddAuthentication("ticket")
    .AddScheme<AuthenticationSchemeOptions, TicketAuthenticationHandler>("ticket", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(origins).AllowAnyHeader().WithMethods("GET", "POST").AllowCredentials()));
builder.Services.AddSignalR(options => {
    options.EnableDetailedErrors = false;
    options.MaximumReceiveMessageSize = 1024;
});
var app = builder.Build();
app.UseCors();
// CORS alone does not protect a WebSocket handshake. Check its Origin explicitly.
app.Use(async (context, next) => {
    if (context.Request.Path.StartsWithSegments("/hubs/orders") &&
        !origins.Contains(context.Request.Headers.Origin.ToString(), StringComparer.Ordinal)) {
        context.Response.StatusCode = 403; return;
    }
    await next(context);
});
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ready" }));
app.MapPost("/internal/orders-changed", async (HttpContext context,
    IHubContext<OrdersHub> hub, PublishReplayGuard replay) => {
    var auth = context.Request.Headers.Authorization.ToString();
    if (!auth.StartsWith("Bearer ", StringComparison.Ordinal) ||
        !RealtimeTicket.Validate(key, auth.Substring(7), "publish", DateTime.UtcNow,
            out _, out var expiry, out var nonce) || !replay.Accept(nonce, expiry))
        return Results.Unauthorized();
    // Invalidation only: the browser reads authoritative data from the API.
    await hub.Clients.Group("admins").SendAsync("OrdersChanged", context.RequestAborted);
    return Results.NoContent();
});
app.MapHub<OrdersHub>("/hubs/orders", options => {
    options.Transports = HttpTransportType.WebSockets; // Never silently fall back to polling.
    options.CloseOnAuthenticationExpiration = true;
}).RequireAuthorization();
app.Run();

public sealed record RealtimeOptions(byte[] Key, string[] Origins);

[Authorize]
public sealed class OrdersHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "admins");
        await base.OnConnectedAsync();
    }
    // No client-callable publishing or customer-data methods.
}

public sealed class PublishReplayGuard
{
    private readonly Dictionary<string, DateTime> used = new();
    private readonly object gate = new();
    public bool Accept(string nonce, DateTime expiry)
    {
        lock (gate) {
            foreach (var old in used.Where(x => x.Value <= DateTime.UtcNow).Select(x => x.Key).ToArray())
                used.Remove(old);
            if (used.Count >= 10000 || used.ContainsKey(nonce)) return false;
            used.Add(nonce, expiry); return true;
        }
    }
}
