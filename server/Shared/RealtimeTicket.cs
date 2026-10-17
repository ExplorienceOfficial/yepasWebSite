using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Yepas.RealtimeSecurity
{
    // Identical source is compiled by Framework 4.8 and .NET 10. No session
    // cookie, password or customer data is placed in the realtime ticket.
    public static class RealtimeTicket
    {
        private static readonly DateTime Epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        public static byte[] ReadKey(string value)
        {
            var key = Convert.FromBase64String(value ?? String.Empty);
            if (key.Length < 32) throw new ArgumentException("Realtime key must contain at least 32 random bytes.");
            return key;
        }

        public static string Issue(byte[] key, string purpose, int userId, DateTime utcNow, int lifetimeSeconds)
        {
            if (purpose != "admin" && purpose != "publish") throw new ArgumentException("Invalid purpose.");
            if (userId <= 0 || lifetimeSeconds < 1 || lifetimeSeconds > 300) throw new ArgumentException("Invalid ticket.");
            var issued = (long)(utcNow.ToUniversalTime() - Epoch).TotalSeconds;
            var payload = purpose + ":" + userId.ToString(CultureInfo.InvariantCulture) + ":" +
                issued.ToString(CultureInfo.InvariantCulture) + ":" +
                (issued + lifetimeSeconds).ToString(CultureInfo.InvariantCulture) + ":" + Guid.NewGuid().ToString("N");
            var encoded = Encode(Encoding.UTF8.GetBytes(payload));
            using (var hmac = new HMACSHA256(key))
                return encoded + "." + Encode(hmac.ComputeHash(Encoding.ASCII.GetBytes(encoded)));
        }

        public static bool Validate(byte[] key, string token, string purpose, DateTime utcNow,
            out int userId, out DateTime expiresUtc, out string nonce)
        {
            userId = 0; expiresUtc = Epoch; nonce = String.Empty;
            if (String.IsNullOrEmpty(token) || token.Length > 512) return false;
            try
            {
                var pieces = token.Split('.');
                if (pieces.Length != 2) return false;
                byte[] expected;
                using (var hmac = new HMACSHA256(key))
                    expected = hmac.ComputeHash(Encoding.ASCII.GetBytes(pieces[0]));
                var supplied = Decode(pieces[1]);
                if (supplied.Length != expected.Length) return false;
                var difference = 0;
                for (var i = 0; i < expected.Length; i++) difference |= supplied[i] ^ expected[i];
                if (difference != 0) return false;
                var values = Encoding.UTF8.GetString(Decode(pieces[0])).Split(':');
                int id; long issued; long expiry; Guid identifier;
                if (values.Length != 5 || values[0] != purpose ||
                    !Int32.TryParse(values[1], NumberStyles.None, CultureInfo.InvariantCulture, out id) || id <= 0 ||
                    !Int64.TryParse(values[2], NumberStyles.None, CultureInfo.InvariantCulture, out issued) ||
                    !Int64.TryParse(values[3], NumberStyles.None, CultureInfo.InvariantCulture, out expiry) ||
                    !Guid.TryParseExact(values[4], "N", out identifier)) return false;
                var now = (long)(utcNow.ToUniversalTime() - Epoch).TotalSeconds;
                if (issued > now + 30 || expiry <= now || expiry <= issued || expiry - issued > 300) return false;
                expiresUtc = Epoch.AddSeconds(expiry); userId = id; nonce = values[4];
                return true;
            }
            catch (FormatException) { return false; }
            catch (ArgumentException) { return false; }
        }

        private static string Encode(byte[] bytes)
        {
            return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        private static byte[] Decode(string text)
        {
            text = text.Replace('-', '+').Replace('_', '/');
            return Convert.FromBase64String(text.PadRight((text.Length + 3) / 4 * 4, '='));
        }
    }
}
