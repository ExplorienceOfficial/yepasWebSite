using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Security.Cryptography;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class DriverManagementRepository
    {
        private const int PasswordIterations = 150000;

        public IList<AdminDriverView> ReadDrivers()
        {
            var drivers = new List<AdminDriverView>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
SELECT P.PERSONEL_ID, P.PERSONEL_KODU,
       LTRIM(RTRIM(ISNULL(P.PERSONEL_ADI, '') + ' ' + ISNULL(P.PERSONEL_SOYADI, ''))),
       P.PERSONEL_DURUM, COUNT(*)
FROM D00013.FIRMA_PERSONELI P
INNER JOIN D00013.BF_PERS_MUST PM ON PM.PERSONEL_ID = P.PERSONEL_ID
WHERE EXISTS (
    SELECT 1 FROM D00013.RS_MUSTERI_BILGILERI MB
    WHERE MB.MUSTERI_ID = PM.MUSTERI_ID
      AND MB.BOLUM_ID = PM.BOLUM_ID
      AND MB.SS = 12
)
GROUP BY P.PERSONEL_ID, P.PERSONEL_KODU, P.PERSONEL_ADI,
         P.PERSONEL_SOYADI, P.PERSONEL_DURUM
ORDER BY P.PERSONEL_KODU, P.PERSONEL_ID", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        drivers.Add(new AdminDriverView {
                            LegacyPersonnelId = reader.GetInt32(0),
                            PersonnelCode = Convert.ToString(reader.GetValue(1)).Trim(),
                            PersonnelName = Convert.ToString(reader.GetValue(2)).Trim(),
                            IsLegacyActive = Convert.ToInt32(reader.GetValue(3)) == 1,
                            BranchCount = reader.GetInt32(4)
                        });
            }

            var byPersonnel = drivers.ToDictionary(item => item.LegacyPersonnelId);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT D.LegacyPersonnelId, U.UserId, U.LoginName, U.IsActive, U.MustChangePassword
FROM dbo.DriverAccounts D
JOIN dbo.Users U ON U.UserId = D.UserId
JOIN dbo.UserRoles R ON R.UserId = U.UserId AND R.RoleCode = N'DRIVER'", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        AdminDriverView driver;
                        if (byPersonnel.TryGetValue(reader.GetInt32(0), out driver))
                            driver.Account = new DriverAccountSummary {
                                UserId = reader.GetInt32(1), LoginName = reader.GetString(2),
                                IsActive = reader.GetBoolean(3), MustChangePassword = reader.GetBoolean(4)
                            };
                    }
            }
            return drivers;
        }

        public DriverAccountSummary CreateAccount(int actorUserId, int personnelId,
            string loginName, string temporaryPassword)
        {
            loginName = ValidateLogin(loginName);
            ValidatePassword(temporaryPassword);
            EnsureActiveLegacyDriver(personnelId);
            if (!String.Equals(loginName, ReadPersonnelCode(personnelId), StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Kullanıcı adı eski sistemdeki personel kodu olmalıdır.");
            var salt = new byte[32];
            using (var random = RandomNumberGenerator.Create()) random.GetBytes(salt);
            var hash = AuthRepository.HashPassword(temporaryPassword, salt, PasswordIterations);
            try
            {
                using (var connection = new SqlConnection(DatabaseConnections.Application()))
                {
                    connection.Open();
                    using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                    {
                        int userId;
                        using (var command = new SqlCommand(@"
INSERT INTO dbo.Users
    (LoginName, LoginNameNormalized, PasswordHash, PasswordSalt,
     PasswordIterations, PasswordAlgorithm, IsActive, MustChangePassword,
     TemporaryPasswordExpiresUtc)
VALUES (@name, @normalized, @hash, @salt, @iterations, N'PBKDF2-SHA256', 1, 1,
        DATEADD(day, 7, GETUTCDATE()));
SELECT CAST(SCOPE_IDENTITY() AS INT);", connection, transaction))
                        {
                            command.Parameters.Add("@name", SqlDbType.NVarChar, 100).Value = loginName;
                            command.Parameters.Add("@normalized", SqlDbType.NVarChar, 100).Value = loginName.ToUpperInvariant();
                            command.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = hash;
                            command.Parameters.Add("@salt", SqlDbType.VarBinary, 32).Value = salt;
                            command.Parameters.Add("@iterations", SqlDbType.Int).Value = PasswordIterations;
                            userId = (int)command.ExecuteScalar();
                        }
                        using (var command = new SqlCommand(@"
INSERT INTO dbo.UserRoles (UserId, RoleCode) VALUES (@userId, N'DRIVER');
INSERT INTO dbo.DriverAccounts (UserId, LegacyPersonnelId) VALUES (@userId, @personnel);",
                            connection, transaction))
                        {
                            command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                            command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                            command.ExecuteNonQuery();
                        }
                        Audit(connection, transaction, actorUserId, personnelId, userId, "ACCOUNT_CREATED");
                        transaction.Commit();
                        return new DriverAccountSummary { UserId = userId, LoginName = loginName,
                            IsActive = true, MustChangePassword = true };
                    }
                }
            }
            finally { Array.Clear(salt, 0, salt.Length); Array.Clear(hash, 0, hash.Length); }
        }

        public void SetStatus(int actorUserId, int userId, bool enabled)
        {
            var personnelId = ReadPersonnelId(userId);
            if (enabled) EnsureActiveLegacyDriver(personnelId);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    using (var command = new SqlCommand(@"
UPDATE dbo.Users SET IsActive = @enabled, UpdatedAtUtc = GETUTCDATE() WHERE UserId = @userId;
IF @enabled = 0
    UPDATE dbo.AuthSessions SET RevokedAtUtc = GETUTCDATE()
    WHERE UserId = @userId AND RevokedAtUtc IS NULL;", connection, transaction))
                    {
                        command.Parameters.Add("@enabled", SqlDbType.Bit).Value = enabled;
                        command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                        command.ExecuteNonQuery();
                    }
                    Audit(connection, transaction, actorUserId, personnelId, userId,
                        enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED");
                    transaction.Commit();
                }
            }
        }

        public void ResetPassword(int actorUserId, int userId, string password)
        {
            ValidatePassword(password);
            var personnelId = ReadPersonnelId(userId);
            var salt = new byte[32];
            using (var random = RandomNumberGenerator.Create()) random.GetBytes(salt);
            var hash = AuthRepository.HashPassword(password, salt, PasswordIterations);
            try
            {
                using (var connection = new SqlConnection(DatabaseConnections.Application()))
                {
                    connection.Open();
                    using (var transaction = connection.BeginTransaction())
                    {
                        using (var command = new SqlCommand(@"
UPDATE dbo.Users SET PasswordHash = @hash, PasswordSalt = @salt,
    PasswordIterations = @iterations, PasswordAlgorithm = N'PBKDF2-SHA256',
    MustChangePassword = 1, TemporaryPasswordExpiresUtc = DATEADD(day, 7, GETUTCDATE()),
    FailedLoginCount = 0, LockoutUntilUtc = NULL, UpdatedAtUtc = GETUTCDATE()
WHERE UserId = @userId;
UPDATE dbo.AuthSessions SET RevokedAtUtc = GETUTCDATE()
WHERE UserId = @userId AND RevokedAtUtc IS NULL;", connection, transaction))
                        {
                            command.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = hash;
                            command.Parameters.Add("@salt", SqlDbType.VarBinary, 32).Value = salt;
                            command.Parameters.Add("@iterations", SqlDbType.Int).Value = PasswordIterations;
                            command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                            command.ExecuteNonQuery();
                        }
                        Audit(connection, transaction, actorUserId, personnelId, userId, "PASSWORD_RESET");
                        transaction.Commit();
                    }
                }
            }
            finally { Array.Clear(salt, 0, salt.Length); Array.Clear(hash, 0, hash.Length); }
        }

        private static int ReadPersonnelId(int userId)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT D.LegacyPersonnelId FROM dbo.DriverAccounts D
JOIN dbo.UserRoles R ON R.UserId = D.UserId AND R.RoleCode = N'DRIVER'
WHERE D.UserId = @userId", connection))
            {
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                connection.Open();
                var value = command.ExecuteScalar();
                if (value == null) throw new KeyNotFoundException("Şoför hesabı bulunamadı.");
                return (int)value;
            }
        }

        private static void EnsureActiveLegacyDriver(int personnelId)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
SELECT 1 FROM D00013.FIRMA_PERSONELI P
WHERE P.PERSONEL_ID = @personnel AND P.PERSONEL_DURUM = 1
  AND EXISTS (
      SELECT 1
      FROM D00013.BF_PERS_MUST PM
      WHERE PM.PERSONEL_ID = P.PERSONEL_ID
        AND EXISTS (
            SELECT 1 FROM D00013.RS_MUSTERI_BILGILERI MB
            WHERE MB.MUSTERI_ID = PM.MUSTERI_ID
              AND MB.BOLUM_ID = PM.BOLUM_ID
              AND MB.SS = 12
        )
  )", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                connection.Open();
                if (command.ExecuteScalar() == null)
                    throw new InvalidOperationException("Eski sistemde aktif rota personeli bulunamadı.");
            }
        }

        private static string ReadPersonnelCode(int personnelId)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(
                "SELECT PERSONEL_KODU FROM D00013.FIRMA_PERSONELI WHERE PERSONEL_ID=@personnel", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                connection.Open();
                var value = command.ExecuteScalar();
                if (value == null || value == DBNull.Value)
                    throw new InvalidOperationException("Eski sistem personel kodu bulunamadı.");
                return Convert.ToString(value).Trim();
            }
        }

        private static void Audit(SqlConnection connection, SqlTransaction transaction,
            int actorUserId, int personnelId, int userId, string action)
        {
            using (var command = new SqlCommand(@"
INSERT INTO dbo.DriverManagementAudit
    (LegacyPersonnelId, TargetUserId, ActionCode, ActorUserId)
VALUES (@personnel, @userId, @action, @actor)", connection, transaction))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                command.Parameters.Add("@action", SqlDbType.NVarChar, 30).Value = action;
                command.Parameters.Add("@actor", SqlDbType.Int).Value = actorUserId;
                command.ExecuteNonQuery();
            }
        }

        private static string ValidateLogin(string value)
        {
            value = value == null ? null : value.Trim();
            if (String.IsNullOrWhiteSpace(value) || value.Length < 2 || value.Length > 100)
                throw new ArgumentException("Kullanıcı adı 2-100 karakter olmalıdır.");
            return value;
        }

        private static void ValidatePassword(string value)
        {
            if (String.IsNullOrEmpty(value) || value.Length < 12 || value.Length > 128)
                throw new ArgumentException("Geçici parola 12-128 karakter olmalıdır.");
        }
    }
}
