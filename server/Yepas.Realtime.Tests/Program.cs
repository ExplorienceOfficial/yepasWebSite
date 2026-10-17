using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using Yepas.RealtimeSecurity;

if (args.Length != 1 || !File.Exists(args[0]))
    throw new ArgumentException("Pass the built Yepas.Realtime.dll path.");
var key = RandomNumberGenerator.GetBytes(32);
var listener = new TcpListener(IPAddress.Loopback, 0);
listener.Start();
var port = ((IPEndPoint)listener.LocalEndpoint).Port;
listener.Stop();
var start = new ProcessStartInfo("dotnet") { UseShellExecute = false };
start.ArgumentList.Add(Path.GetFullPath(args[0]));
start.Environment["ASPNETCORE_URLS"] = $"http://127.0.0.1:{port}";
start.Environment["Yepas__RealtimeKey"] = Convert.ToBase64String(key);
start.Environment["Yepas__AllowedOrigins"] = "https://admin.test";
using var process = Process.Start(start) ?? throw new Exception("Service did not start.");
using var http = new HttpClient { BaseAddress = new Uri($"http://127.0.0.1:{port}"), Timeout = TimeSpan.FromSeconds(2) };
try
{
    var ready = false;
    for (var attempt = 0; attempt < 40; attempt++) {
        if (process.HasExited) throw new Exception("Service exited during startup.");
        try { using var health = await http.GetAsync("/health"); ready = health.IsSuccessStatusCode; }
        catch (HttpRequestException) { }
        catch (TaskCanceledException) { }
        if (ready) break;
        await Task.Delay(250);
    }
    Check(ready, "service health");
    using (var noOrigin = await http.GetAsync("/hubs/orders"))
        Check(noOrigin.StatusCode == HttpStatusCode.Forbidden, "missing Origin is rejected");
    using (var req = new HttpRequestMessage(HttpMethod.Get, "/hubs/orders")) {
        req.Headers.Add("Origin", "https://attacker.test");
        using var res = await http.SendAsync(req);
        Check(res.StatusCode == HttpStatusCode.Forbidden, "wrong Origin is rejected");
    }
    using (var req = new HttpRequestMessage(HttpMethod.Get, "/hubs/orders?access_token=invalid")) {
        req.Headers.Add("Origin", "https://admin.test");
        using var res = await http.SendAsync(req);
        Check(res.StatusCode == HttpStatusCode.Unauthorized, "bad ticket is rejected");
    }
    using (var res = await Publish(null))
        Check(res.StatusCode == HttpStatusCode.Unauthorized, "unsigned publication is rejected");
    var admin = RealtimeTicket.Issue(key, "admin", 42, DateTime.UtcNow, 300);
    using (var res = await Publish(admin))
        Check(res.StatusCode == HttpStatusCode.Unauthorized, "admin ticket cannot publish");
    using var socket = new ClientWebSocket();
    socket.Options.SetRequestHeader("Origin", "https://admin.test");
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
    await socket.ConnectAsync(new Uri($"ws://127.0.0.1:{port}/hubs/orders?access_token={admin}"), timeout.Token);
    var handshake = Encoding.UTF8.GetBytes("{\"protocol\":\"json\",\"version\":1}\u001e");
    await socket.SendAsync(handshake.AsMemory(), WebSocketMessageType.Text, true, timeout.Token);
    var first = await Receive(socket, timeout.Token);
    Check(first.Contains("{}\u001e"), "SignalR WebSocket handshake");
    var publish = RealtimeTicket.Issue(key, "publish", 1, DateTime.UtcNow, 30);
    using (var res = await Publish(publish))
        Check(res.StatusCode == HttpStatusCode.NoContent, "signed publication accepted");
    var received = first;
    while (!received.Contains("OrdersChanged")) received += await Receive(socket, timeout.Token);
    Check(received.Contains("\"target\":\"OrdersChanged\""), "actual WebSocket invalidation received");
    using (var res = await Publish(publish))
        Check(res.StatusCode == HttpStatusCode.Unauthorized, "publication replay is rejected");
    var expired = RealtimeTicket.Issue(key, "publish", 1, DateTime.UtcNow.AddMinutes(-1), 30);
    using (var res = await Publish(expired))
        Check(res.StatusCode == HttpStatusCode.Unauthorized, "expired publication is rejected");
    Console.WriteLine("PASS: real Linux-compatible service, WebSocket handshake, broadcast, Origin/auth/purpose/expiry/replay checks.");
}
finally
{
    if (!process.HasExited) process.Kill(entireProcessTree: true);
    await process.WaitForExitAsync();
}

async Task<HttpResponseMessage> Publish(string? token)
{
    using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/orders-changed");
    if (token != null) request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    return await http.SendAsync(request);
}

static async Task<string> Receive(ClientWebSocket socket, CancellationToken cancellation)
{
    var buffer = new byte[4096];
    var message = new StringBuilder();
    ValueWebSocketReceiveResult result;
    do {
        result = await socket.ReceiveAsync(buffer.AsMemory(), cancellation);
        if (result.MessageType == WebSocketMessageType.Close) throw new Exception("Unexpected connection close.");
        message.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
        if (message.Length > 8192) throw new Exception("Unexpectedly large frame.");
    } while (!result.EndOfMessage);
    return message.ToString();
}

static void Check(bool success, string name)
{
    if (!success) throw new Exception("FAIL: " + name);
    Console.WriteLine("PASS: " + name);
}
