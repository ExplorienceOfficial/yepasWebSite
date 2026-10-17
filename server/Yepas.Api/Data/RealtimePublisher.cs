using System;
using System.Configuration;
using System.Diagnostics;
using System.Data;
using System.Data.SqlClient;
using System.Collections.Generic;
using System.Threading;
using System.IO;
using System.Globalization;
using System.Security.Cryptography;
using System.Net.Http;
using System.Net.Http.Headers;
using Yepas.RealtimeSecurity;

namespace Yepas.Api.Data
{
    // Reconcile committed business state, not a queue in the order transaction.
    public static class RealtimePublisher
    {
        private static readonly HttpClient Client = new HttpClient {
            Timeout = TimeSpan.FromSeconds(1)
        };
        private static string processUrl;
        private static string processKey;
        private static int draining;

        private static string PublishUrl {
            get { return processUrl ?? ConfigurationManager.AppSettings["YepasRealtimePublishUrl"]; }
        }

        public static void ConfigureForProcess(string url, string key)
        {
            processUrl = url; processKey = key;
        }

        public static void NotifyCommitted()
        {
            Drain(TrySend);
        }

        internal static void Drain(Func<bool> deliver)
        {
            if (Interlocked.CompareExchange(ref draining, 1, 0) != 0) return;
            try
            {
                if (String.IsNullOrEmpty(PublishUrl)) return;
                using (var connection = new SqlConnection(DatabaseConnections.Application()))
                {
                    connection.Open();
                    var fingerprint = ReadFingerprint(connection);
                    byte[] delivered = null;
                    try
                    {
                        using (var read = new SqlCommand("SELECT DeliveredFingerprint FROM dbo.RealtimeDeliveryState WHERE StateId=1", connection))
                        {
                            read.CommandTimeout = 2;
                            var value = read.ExecuteScalar();
                            if (value != null && value != DBNull.Value) delivered = (byte[])value;
                        }
                    }
                    catch (SqlException) { /* Checkpoint failure cannot prevent a direct signal. */ }
                    if (Same(fingerprint, delivered) || !deliver()) return;
                    using (var ack = new SqlCommand(@"
UPDATE dbo.RealtimeDeliveryState SET DeliveredFingerprint=@fingerprint,
    DeliveredAt=GETDATE() WHERE StateId=1", connection))
                    {
                        ack.CommandTimeout = 2;
                        ack.Parameters.Add("@fingerprint", SqlDbType.Binary, 32).Value = fingerprint;
                        ack.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception) { Trace.TraceWarning("Realtime queue delivery unavailable; committed data is unchanged."); }
            finally { Interlocked.Exchange(ref draining, 0); }
        }

        private static bool Same(byte[] left, byte[] right)
        {
            if (right == null || left.Length != right.Length) return false;
            var difference = 0;
            for (var i=0;i<left.Length;i++) difference |= left[i] ^ right[i];
            return difference == 0;
        }

        private static byte[] ReadFingerprint(SqlConnection connection)
        {
            // App audit IDs are append-only. COUNT+SUM also catches a lower
            // identity committing after a higher one, unlike a MAX cursor.
            const string sql = @"
SELECT COUNT_BIG(*),COALESCE(SUM(CAST(AuditId AS BIGINT)),0) FROM dbo.OrderAudit;
SELECT COUNT_BIG(*),COALESCE(SUM(CAST(AuditId AS BIGINT)),0) FROM dbo.OrderWindowAudit;
SELECT SettingsId,CutoffMinute,OverrideMode,OverrideUntil,UpdatedAt FROM dbo.OrderSettings ORDER BY SettingsId;
SELECT OrderId,Revision,Status,IntegrationStatus,LastExportedRevision,LastExportedAt FROM dbo.Orders ORDER BY OrderId;
SELECT FinalizationId,State,AttemptCount,FinalizedAt,ClosedAt FROM dbo.OrderFinalizations ORDER BY FinalizationId;";
            using (var bytes = new MemoryStream())
            using (var writer = new BinaryWriter(bytes))
            using (var read = new SqlCommand(sql, connection))
            {
                read.CommandTimeout = 2;
                using (var reader = read.ExecuteReader())
                {
                    do
                    {
                        writer.Write(reader.FieldCount);
                        while (reader.Read())
                        {
                            writer.Write(true);
                            for (var i=0;i<reader.FieldCount;i++)
                            {
                                writer.Write(!reader.IsDBNull(i));
                                if (reader.IsDBNull(i)) continue;
                                var value = reader.GetValue(i);
                                writer.Write(value is DateTime ? ((DateTime)value).ToString("O",CultureInfo.InvariantCulture) :
                                    Convert.ToString(value,CultureInfo.InvariantCulture));
                            }
                        }
                        writer.Write(false);
                    } while (reader.NextResult());
                }
                writer.Flush();
                using (var sha = SHA256.Create()) return sha.ComputeHash(bytes.ToArray());
            }
        }

        public static bool TrySend()
        {
            try
            {
                var url = PublishUrl;
                if (String.IsNullOrEmpty(url)) return false;
                Uri target;
                if (!Uri.TryCreate(url, UriKind.Absolute, out target) || target.Scheme != "https" ||
                    target.AbsolutePath != "/internal/orders-changed" ||
                    !String.IsNullOrEmpty(target.Query) || !String.IsNullOrEmpty(target.UserInfo))
                    throw new InvalidOperationException("Invalid realtime publish URL.");
                var key = RealtimeTicket.ReadKey(processKey ?? ConfigurationManager.AppSettings["YepasRealtimeKey"]);
                using (var request = new HttpRequestMessage(HttpMethod.Post, target))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer",
                        RealtimeTicket.Issue(key, "publish", 1, DateTime.UtcNow, 30));
                    using (var response = Client.SendAsync(request).GetAwaiter().GetResult())
                        return response.StatusCode == System.Net.HttpStatusCode.NoContent;
                }
            }
            catch (Exception)
            {
                // No credentials, URL tokens or customer data in the diagnostic.
                Trace.TraceWarning("Realtime invalidation unavailable; committed data is unchanged.");
                return false;
            }
        }
    }
}
