using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Security.Cryptography;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class CustomerManagementRepository
    {
        private const int PasswordIterations = 150000;

        public IList<AdminCustomerView> ReadCustomers()
        {
            var customers = new LegacyCustomerCatalogReader().Read();
            var byMb = customers.ToDictionary(item => item.LegacyMbId);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT C.LegacyMbId, U.UserId, U.LoginName, U.IsActive, U.MustChangePassword
FROM dbo.CustomerAccess C
JOIN dbo.Users U ON U.UserId = C.UserId
JOIN dbo.UserRoles R ON R.UserId = U.UserId AND R.RoleCode = N'CUSTOMER'", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        AdminCustomerView customer;
                        if (byMb.TryGetValue(reader.GetInt32(0), out customer))
                            customer.Account = new CustomerAccountSummary
                            {
                                UserId = reader.GetInt32(1),
                                LoginName = reader.GetString(2),
                                IsActive = reader.GetBoolean(3),
                                MustChangePassword = reader.GetBoolean(4)
                            };
                    }
            }
            return customers;
        }

        public CustomerAccountSummary CreateAccount(int actorUserId, string loginName,
            string temporaryPassword, IList<int> legacyMbIds)
        {
            loginName = ValidateLogin(loginName);
            ValidatePassword(temporaryPassword);
            var branches = ValidateBranches(legacyMbIds);
            EnsureLegacyBranchesExist(branches);
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
                        EnsureBranchesAvailable(connection, transaction, branches, null);
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
                        using (var role = new SqlCommand(
                            "INSERT INTO dbo.UserRoles (UserId, RoleCode) VALUES (@userId, N'CUSTOMER')",
                            connection, transaction))
                        {
                            role.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                            role.ExecuteNonQuery();
                        }
                        InsertBranchesAndAudit(connection, transaction, actorUserId, userId, branches,
                            "ACCOUNT_CREATED");
                        transaction.Commit();
                        return new CustomerAccountSummary { UserId = userId, LoginName = loginName,
                            IsActive = true, MustChangePassword = true };
                    }
                }
            }
            finally { Array.Clear(salt, 0, salt.Length); Array.Clear(hash, 0, hash.Length); }
        }

        public void ReplaceBranches(int actorUserId, int userId, IList<int> legacyMbIds)
        {
            var branches = ValidateBranches(legacyMbIds);
            EnsureLegacyBranchesExist(branches);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    EnsureCustomerUser(connection, transaction, userId);
                    EnsureBranchesAvailable(connection, transaction, branches, userId);
                    using (var delete = new SqlCommand(
                        "DELETE FROM dbo.CustomerAccess WHERE UserId = @userId", connection, transaction))
                    {
                        delete.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                        delete.ExecuteNonQuery();
                    }
                    InsertBranchesAndAudit(connection, transaction, actorUserId, userId, branches,
                        "BRANCHES_REPLACED");
                    transaction.Commit();
                }
            }
        }

        public void SetStatus(int actorUserId, int userId, bool enabled)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    var branches = ReadUserBranches(connection, transaction, userId);
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
                    foreach (var branch in branches)
                        Audit(connection, transaction, actorUserId, branch, userId,
                            enabled ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED");
                    transaction.Commit();
                }
            }
        }

        public void ResetPassword(int actorUserId, int userId, string password)
        {
            ValidatePassword(password);
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
                        var branches = ReadUserBranches(connection, transaction, userId);
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
                        foreach (var branch in branches)
                            Audit(connection, transaction, actorUserId, branch, userId, "PASSWORD_RESET");
                        transaction.Commit();
                    }
                }
            }
            finally { Array.Clear(salt, 0, salt.Length); Array.Clear(hash, 0, hash.Length); }
        }

        private static IList<int> ValidateBranches(IList<int> values)
        {
            var branches = (values ?? new List<int>()).Distinct().ToList();
            if (branches.Count == 0 || branches.Any(value => value <= 0) || branches.Count > 100)
                throw new ArgumentException("En az bir, en fazla 100 geçerli şube seçilmelidir.");
            return branches;
        }

        private static void EnsureLegacyBranchesExist(IList<int> branches)
        {
            var reader = new LegacyCustomerScheduleReader();
            int? customerId = null;
            foreach (var branch in branches)
            {
                var schedule = reader.Read(branch);
                if (schedule == null) throw new KeyNotFoundException("Şube bulunamadı: " + branch);
                if (!customerId.HasValue) customerId = schedule.LegacyCustomerId;
                else if (customerId.Value != schedule.LegacyCustomerId)
                    throw new ArgumentException("Tek hesapta yalnızca aynı müşterinin şubeleri seçilebilir.");
            }
        }

        private static void EnsureBranchesAvailable(SqlConnection connection, SqlTransaction transaction,
            IList<int> branches, int? allowedUserId)
        {
            foreach (var branch in branches)
                using (var command = new SqlCommand(@"
SELECT UserId FROM dbo.CustomerAccess WITH (UPDLOCK, HOLDLOCK)
WHERE LegacyMbId = @mbId", connection, transaction))
                {
                    command.Parameters.Add("@mbId", SqlDbType.Int).Value = branch;
                    var found = command.ExecuteScalar();
                    if (found != null && (!allowedUserId.HasValue || (int)found != allowedUserId.Value))
                        throw new InvalidOperationException("Şube başka bir hesaba bağlı: " + branch);
                }
        }

        private static void EnsureCustomerUser(SqlConnection connection, SqlTransaction transaction, int userId)
        {
            using (var command = new SqlCommand(@"
SELECT 1 FROM dbo.UserRoles WHERE UserId = @userId AND RoleCode = N'CUSTOMER'",
                connection, transaction))
            {
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                if (command.ExecuteScalar() == null) throw new KeyNotFoundException("Müşteri hesabı bulunamadı.");
            }
        }

        private static IList<int> ReadUserBranches(SqlConnection connection, SqlTransaction transaction, int userId)
        {
            EnsureCustomerUser(connection, transaction, userId);
            var branches = new List<int>();
            using (var command = new SqlCommand(
                "SELECT LegacyMbId FROM dbo.CustomerAccess WHERE UserId = @userId", connection, transaction))
            {
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                using (var reader = command.ExecuteReader()) while (reader.Read()) branches.Add(reader.GetInt32(0));
            }
            return branches;
        }

        private static void InsertBranchesAndAudit(SqlConnection connection, SqlTransaction transaction,
            int actorUserId, int userId, IList<int> branches, string action)
        {
            foreach (var branch in branches)
            {
                using (var command = new SqlCommand(
                    "INSERT INTO dbo.CustomerAccess (UserId, LegacyMbId) VALUES (@userId, @mbId)",
                    connection, transaction))
                {
                    command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                    command.Parameters.Add("@mbId", SqlDbType.Int).Value = branch;
                    command.ExecuteNonQuery();
                }
                Audit(connection, transaction, actorUserId, branch, userId, action);
            }
        }

        private static void Audit(SqlConnection connection, SqlTransaction transaction,
            int actorUserId, int legacyMbId, int userId, string action)
        {
            using (var command = new SqlCommand(@"
INSERT INTO dbo.CustomerManagementAudit
    (LegacyMbId, TargetUserId, ActionCode, Detail, ActorUserId)
VALUES (@mbId, @userId, @action, NULL, @actor)", connection, transaction))
            {
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                command.Parameters.Add("@action", SqlDbType.NVarChar, 30).Value = action;
                command.Parameters.Add("@actor", SqlDbType.Int).Value = actorUserId;
                command.ExecuteNonQuery();
            }
        }

        private static string ValidateLogin(string value)
        {
            value = value == null ? null : value.Trim();
            if (String.IsNullOrWhiteSpace(value) || value.Length < 3 || value.Length > 100)
                throw new ArgumentException("Kullanıcı adı 3-100 karakter olmalıdır.");
            return value;
        }

        private static void ValidatePassword(string value)
        {
            if (String.IsNullOrEmpty(value) || value.Length < 12 || value.Length > 128)
                throw new ArgumentException("Geçici parola 12-128 karakter olmalıdır.");
        }
    }
}
