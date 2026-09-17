using System;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Cryptography;
using System.Web.Configuration;

namespace Yepas.AdminTool
{
    internal static class Program
    {
        private const int PasswordIterations = 150000;

        private static int Main(string[] args)
        {
            try
            {
                var sitePath = ReadArgument(args, "--site-path");
                var loginName = ReadArgument(args, "--login-name");
                if (String.IsNullOrWhiteSpace(sitePath) || String.IsNullOrWhiteSpace(loginName))
                {
                    Console.Error.WriteLine("Kullanım: Yepas.AdminTool.exe --site-path <site klasörü> --login-name <kullanıcı adı>");
                    return 2;
                }

                sitePath = Path.GetFullPath(sitePath);
                if (!File.Exists(Path.Combine(sitePath, "Web.config")))
                    throw new InvalidOperationException("Site klasöründe Web.config bulunamadı.");

                loginName = loginName.Trim();
                if (loginName.Length < 3 || loginName.Length > 100)
                    throw new InvalidOperationException("Kullanıcı adı 3-100 karakter olmalı.");

                var password = ReadPassword("Yeni admin parolası (en az 12 karakter): ");
                var confirmation = ReadPassword("Parolayı tekrar girin: ");
                try
                {
                    if (SecureLength(password) < 12)
                        throw new InvalidOperationException("Parola en az 12 karakter olmalı.");
                    if (!SecureEquals(password, confirmation))
                        throw new InvalidOperationException("Parolalar eşleşmiyor.");

                    var connectionString = ReadAppConnectionString(sitePath);
                    CreateAdmin(connectionString, loginName, password);
                }
                finally
                {
                    password.Dispose();
                    confirmation.Dispose();
                }

                Console.WriteLine("Admin hesabı oluşturuldu. Parola yalnızca özetiyle saklandı.");
                return 0;
            }
            catch (SqlException exception)
            {
                if (exception.Number == 2601 || exception.Number == 2627)
                    Console.Error.WriteLine("Bu kullanıcı adı zaten mevcut.");
                else
                    Console.Error.WriteLine("SQL işlemi başarısız: " + exception.Message);
                return 1;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine("Admin oluşturulamadı: " + exception.Message);
                return 1;
            }
        }

        private static string ReadArgument(string[] args, string name)
        {
            for (var index = 0; index < args.Length - 1; index++)
                if (String.Equals(args[index], name, StringComparison.OrdinalIgnoreCase))
                    return args[index + 1];
            return null;
        }

        private static SecureString ReadPassword(string prompt)
        {
            Console.Write(prompt);
            var value = new SecureString();
            while (true)
            {
                var key = Console.ReadKey(true);
                if (key.Key == ConsoleKey.Enter)
                {
                    Console.WriteLine();
                    value.MakeReadOnly();
                    return value;
                }
                if (key.Key == ConsoleKey.Backspace)
                {
                    if (value.Length > 0) value.RemoveAt(value.Length - 1);
                    continue;
                }
                if (!Char.IsControl(key.KeyChar)) value.AppendChar(key.KeyChar);
            }
        }

        private static int SecureLength(SecureString value)
        {
            return value == null ? 0 : value.Length;
        }

        private static bool SecureEquals(SecureString first, SecureString second)
        {
            if (first == null || second == null || first.Length != second.Length) return false;
            var firstPointer = IntPtr.Zero;
            var secondPointer = IntPtr.Zero;
            try
            {
                firstPointer = Marshal.SecureStringToBSTR(first);
                secondPointer = Marshal.SecureStringToBSTR(second);
                var difference = 0;
                for (var index = 0; index < first.Length; index++)
                    difference |= Marshal.ReadInt16(firstPointer, index * 2) ^ Marshal.ReadInt16(secondPointer, index * 2);
                return difference == 0;
            }
            finally
            {
                if (firstPointer != IntPtr.Zero) Marshal.ZeroFreeBSTR(firstPointer);
                if (secondPointer != IntPtr.Zero) Marshal.ZeroFreeBSTR(secondPointer);
            }
        }

        private static string ReadAppConnectionString(string sitePath)
        {
            var mapping = new WebConfigurationFileMap();
            mapping.VirtualDirectories.Add("/", new VirtualDirectoryMapping(sitePath, true));
            var configuration = WebConfigurationManager.OpenMappedWebConfiguration(mapping, "/");
            var setting = configuration.ConnectionStrings.ConnectionStrings["YepasApp"];
            if (setting == null || String.IsNullOrWhiteSpace(setting.ConnectionString))
                throw new InvalidOperationException("YepasApp bağlantı dizesi bulunamadı.");
            return setting.ConnectionString;
        }

        private static void CreateAdmin(string connectionString, string loginName, SecureString securePassword)
        {
            var passwordPointer = IntPtr.Zero;
            byte[] salt = null;
            byte[] hash = null;
            try
            {
                passwordPointer = Marshal.SecureStringToBSTR(securePassword);
                var password = Marshal.PtrToStringBSTR(passwordPointer);
                salt = new byte[32];
                using (var random = RandomNumberGenerator.Create()) random.GetBytes(salt);
                using (var derive = new Rfc2898DeriveBytes(password, salt, PasswordIterations, HashAlgorithmName.SHA256))
                    hash = derive.GetBytes(32);

                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    using (var transaction = connection.BeginTransaction())
                    using (var command = connection.CreateCommand())
                    {
                        command.Transaction = transaction;
                        command.CommandText = @"
INSERT INTO dbo.Users
    (LoginName, LoginNameNormalized, PasswordHash, PasswordSalt,
     PasswordIterations, PasswordAlgorithm, IsActive, MustChangePassword)
VALUES (@name, @normalized, @hash, @salt,
        150000, N'PBKDF2-SHA256', 1, 0);
DECLARE @id INT;
SET @id = CAST(SCOPE_IDENTITY() AS INT);
INSERT INTO dbo.UserRoles (UserId, RoleCode) VALUES (@id, N'ADMIN');";
                        command.Parameters.Add("@name", SqlDbType.NVarChar, 100).Value = loginName;
                        command.Parameters.Add("@normalized", SqlDbType.NVarChar, 100).Value = loginName.ToUpperInvariant();
                        command.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = hash;
                        command.Parameters.Add("@salt", SqlDbType.VarBinary, 32).Value = salt;
                        command.ExecuteNonQuery();
                        transaction.Commit();
                    }
                }
            }
            finally
            {
                if (passwordPointer != IntPtr.Zero) Marshal.ZeroFreeBSTR(passwordPointer);
                if (salt != null) Array.Clear(salt, 0, salt.Length);
                if (hash != null) Array.Clear(hash, 0, hash.Length);
            }
        }
    }
}
