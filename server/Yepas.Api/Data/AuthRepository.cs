using System;
using System.Data;
using System.Data.SqlClient;
using System.Security.Cryptography;

namespace Yepas.Api.Data
{
    public sealed class AuthIdentity
    {
        public int UserId { get; set; }
        public string LoginName { get; set; }
        public string Role { get; set; }
        public int? LegacyPersonnelId { get; set; }
        public bool MustChangePassword { get; set; }
    }

    public sealed class AuthRepository
    {
        private const string CookieName = "yepas.sid";
        public static string SessionCookieName { get { return CookieName; } }

        private static string AppConnectionString()
        {
            return DatabaseConnections.Application();
        }

        private static string LegacyConnectionString()
        {
            return DatabaseConnections.Catalog();
        }

        private static byte[] Sha256(byte[] bytes)
        {
            using (var sha = SHA256.Create()) return sha.ComputeHash(bytes);
        }

        private static bool Equal(byte[] left, byte[] right)
        {
            if (left == null || right == null || left.Length != right.Length) return false;
            var difference = 0;
            for (var i = 0; i < left.Length; i++) difference |= left[i] ^ right[i];
            return difference == 0;
        }

        public static byte[] HashPassword(string password, byte[] salt, int iterations)
        {
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256))
                return pbkdf2.GetBytes(32);
        }

        private static bool PersonnelExists(int personnelId)
        {
            using (var connection = new SqlConnection(LegacyConnectionString()))
            using (var command = new SqlCommand("SELECT 1 FROM D00013.FIRMA_PERSONELI WHERE PERSONEL_ID = @id", connection))
            {
                command.Parameters.Add("@id", SqlDbType.Int).Value = personnelId;
                connection.Open();
                return command.ExecuteScalar() != null;
            }
        }

        public AuthIdentity Login(string loginName, string password, string role, out string token)
        {
            token = null;
            if (String.IsNullOrWhiteSpace(loginName) || String.IsNullOrEmpty(password) ||
                (role != "ADMIN" && role != "DRIVER")) return null;

            var normalized = loginName.Trim().ToUpperInvariant();
            if (normalized.Length > 100 || password.Length > 1024) return null;

            using (var connection = new SqlConnection(AppConnectionString()))
            {
                connection.Open();
                using (var command = new SqlCommand(@"
SELECT U.UserId, U.LoginName, U.PasswordHash, U.PasswordSalt,
       U.PasswordIterations, U.PasswordAlgorithm, U.IsActive,
       U.MustChangePassword, U.TemporaryPasswordExpiresUtc,
       U.LockoutUntilUtc, D.LegacyPersonnelId
FROM dbo.Users U
JOIN dbo.UserRoles R ON R.UserId = U.UserId AND R.RoleCode = @role
LEFT JOIN dbo.DriverAccounts D ON D.UserId = U.UserId
WHERE U.LoginNameNormalized = @name", connection))
                {
                    command.Parameters.Add("@name", SqlDbType.NVarChar, 100).Value = normalized;
                    command.Parameters.Add("@role", SqlDbType.NVarChar, 20).Value = role;
                    using (var reader = command.ExecuteReader())
                    {
                        if (!reader.Read()) return null;
                        var userId = reader.GetInt32(0);
                        var storedHash = reader.IsDBNull(2) ? null : (byte[])reader[2];
                        var salt = reader.IsDBNull(3) ? null : (byte[])reader[3];
                        var iterations = reader.IsDBNull(4) ? 0 : reader.GetInt32(4);
                        var algorithm = reader.IsDBNull(5) ? null : reader.GetString(5);
                        var enabled = reader.GetBoolean(6);
                        var mustChange = reader.GetBoolean(7);
                        var tempExpires = reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8);
                        var lockedUntil = reader.IsDBNull(9) ? (DateTime?)null : reader.GetDateTime(9);
                        var personnelId = reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10);
                        var identity = new AuthIdentity {
                            UserId = userId, LoginName = reader.GetString(1), Role = role,
                            LegacyPersonnelId = personnelId, MustChangePassword = mustChange
                        };
                        reader.Close();

                        if (!enabled || storedHash == null || salt == null ||
                            algorithm != "PBKDF2-SHA256" || iterations < 100000 ||
                            (lockedUntil.HasValue && lockedUntil.Value > DateTime.UtcNow) ||
                            (tempExpires.HasValue && tempExpires.Value <= DateTime.UtcNow)) return null;

                        var actualHash = HashPassword(password, salt, iterations);
                        if (!Equal(storedHash, actualHash))
                        {
                            using (var fail = new SqlCommand(@"
UPDATE dbo.Users SET FailedLoginCount = FailedLoginCount + 1,
    LockoutUntilUtc = CASE WHEN FailedLoginCount + 1 >= 5
        THEN DATEADD(minute, 15, GETUTCDATE()) ELSE LockoutUntilUtc END
WHERE UserId = @id", connection))
                            {
                                fail.Parameters.Add("@id", SqlDbType.Int).Value = userId;
                                fail.ExecuteNonQuery();
                            }
                            return null;
                        }

                        if (role == "DRIVER" && (!personnelId.HasValue || !PersonnelExists(personnelId.Value)))
                            return null;

                        using (var reset = new SqlCommand(@"
UPDATE dbo.Users SET FailedLoginCount = 0, LockoutUntilUtc = NULL WHERE UserId = @id", connection))
                        {
                            reset.Parameters.Add("@id", SqlDbType.Int).Value = userId;
                            reset.ExecuteNonQuery();
                        }

                        var secret = new byte[32];
                        using (var random = RandomNumberGenerator.Create()) random.GetBytes(secret);
                        var hash = Sha256(secret);
                        using (var insert = new SqlCommand(@"
INSERT INTO dbo.AuthSessions (UserId, RoleCode, TokenHash, ExpiresAtUtc)
VALUES (@id, @role, @hash, DATEADD(hour, 8, GETUTCDATE()))", connection))
                        {
                            insert.Parameters.Add("@id", SqlDbType.Int).Value = userId;
                            insert.Parameters.Add("@role", SqlDbType.NVarChar, 20).Value = role;
                            insert.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = hash;
                            insert.ExecuteNonQuery();
                        }
                        token = Convert.ToBase64String(secret).TrimEnd('=').Replace('+', '-').Replace('/', '_');
                        return identity;
                    }
                }
            }
        }

        private static byte[] ParseToken(string token)
        {
            if (String.IsNullOrEmpty(token) || token.Length != 43) return null;
            foreach (var ch in token)
                if (!((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') ||
                      (ch >= '0' && ch <= '9') || ch == '-' || ch == '_')) return null;
            try { return Convert.FromBase64String(token.Replace('-', '+').Replace('_', '/') + "="); }
            catch (FormatException) { return null; }
        }

        public AuthIdentity Authenticate(string token, string requiredRole)
        {
            var secret = ParseToken(token);
            if (secret == null || secret.Length != 32) return null;
            var hash = Sha256(secret);
            using (var connection = new SqlConnection(AppConnectionString()))
            using (var command = new SqlCommand(@"
SELECT TOP 1 U.UserId, U.LoginName, U.MustChangePassword, R.RoleCode, D.LegacyPersonnelId
FROM dbo.AuthSessions S
JOIN dbo.Users U ON U.UserId = S.UserId
JOIN dbo.UserRoles R ON R.UserId = U.UserId AND R.RoleCode = S.RoleCode
LEFT JOIN dbo.DriverAccounts D ON D.UserId = U.UserId
WHERE S.TokenHash = @hash AND S.RevokedAtUtc IS NULL
  AND S.ExpiresAtUtc > GETUTCDATE() AND U.IsActive = 1
  AND (@role IS NULL OR S.RoleCode = @role)
ORDER BY R.RoleCode", connection))
            {
                command.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = hash;
                command.Parameters.Add("@role", SqlDbType.NVarChar, 20).Value =
                    requiredRole == null ? (object)DBNull.Value : requiredRole;
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    var identity = new AuthIdentity {
                        UserId = reader.GetInt32(0), LoginName = reader.GetString(1),
                        MustChangePassword = reader.GetBoolean(2), Role = reader.GetString(3),
                        LegacyPersonnelId = reader.IsDBNull(4) ? (int?)null : reader.GetInt32(4)
                    };
                    reader.Close();
                    if (identity.Role == "DRIVER" &&
                        (!identity.LegacyPersonnelId.HasValue || !PersonnelExists(identity.LegacyPersonnelId.Value)))
                    {
                        Revoke(token);
                        return null;
                    }
                    return identity;
                }
            }
        }

        public void Revoke(string token)
        {
            var secret = ParseToken(token);
            if (secret == null || secret.Length != 32) return;
            using (var connection = new SqlConnection(AppConnectionString()))
            using (var command = new SqlCommand(@"
UPDATE dbo.AuthSessions SET RevokedAtUtc = GETUTCDATE()
WHERE TokenHash = @hash AND RevokedAtUtc IS NULL", connection))
            {
                command.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = Sha256(secret);
                connection.Open();
                command.ExecuteNonQuery();
            }
        }

        public bool SetDriverAccess(int legacyPersonnelId, bool enabled)
        {
            if (legacyPersonnelId <= 0) return false;
            if (enabled && !PersonnelExists(legacyPersonnelId)) return false;
            using (var connection = new SqlConnection(AppConnectionString()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        int userId;
                        using (var find = new SqlCommand(@"
SELECT D.UserId FROM dbo.DriverAccounts D
WHERE D.LegacyPersonnelId = @personnel
  AND EXISTS (SELECT 1 FROM dbo.UserRoles R WHERE R.UserId = D.UserId AND R.RoleCode = N'DRIVER')
  AND NOT EXISTS (SELECT 1 FROM dbo.UserRoles R WHERE R.UserId = D.UserId AND R.RoleCode <> N'DRIVER')", connection, transaction))
                        {
                            find.Parameters.Add("@personnel", SqlDbType.Int).Value = legacyPersonnelId;
                            var found = find.ExecuteScalar();
                            if (found == null)
                            {
                                transaction.Rollback();
                                return false;
                            }
                            userId = (int)found;
                        }
                        using (var update = new SqlCommand(@"
UPDATE dbo.Users SET IsActive = @enabled, UpdatedAtUtc = GETUTCDATE()
WHERE UserId = @id", connection, transaction))
                        {
                            update.Parameters.Add("@enabled", SqlDbType.Bit).Value = enabled;
                            update.Parameters.Add("@id", SqlDbType.Int).Value = userId;
                            update.ExecuteNonQuery();
                        }
                        if (!enabled)
                        {
                            using (var revoke = new SqlCommand(@"
UPDATE dbo.AuthSessions SET RevokedAtUtc = GETUTCDATE()
WHERE UserId = @id AND RevokedAtUtc IS NULL", connection, transaction))
                            {
                                revoke.Parameters.Add("@id", SqlDbType.Int).Value = userId;
                                revoke.ExecuteNonQuery();
                            }
                        }
                        transaction.Commit();
                        return true;
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }
    }
}
