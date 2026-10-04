using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Domain;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    /// <summary>
    /// One delivery day's owned mobile receipts and application export metadata
    /// are changed in one local SQL Server transaction. It never adopts an
    /// unregistered U-* receipt and never treats a failed source read as empty.
    /// </summary>
    public sealed class AtomicOrderDaySynchronizer
    {
        private sealed class RegisteredReceipt
        {
            public int ReceiptId;
            public int MbId;
            public int CustomerId;
            public int DepartmentId;
            public int LastSyncedRevision;
        }

        private readonly LegacyOrderExporter exporter = new LegacyOrderExporter();

        public OrderFinalizationView Synchronize(int? userId, DateTime deliveryDate, bool closeDay)
        {
            var catalogName = VerifySameInstanceAndCatalogAccess();
            var prefix = "[" + catalogName.Replace("]", "]]") + "].[D00013].";
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    LockDay(connection, transaction, deliveryDate);
                    if (ReadClosedAt(connection, transaction, deliveryDate).HasValue)
                    {
                        // Re-running the scheduled job must never rewrite a closed day.
                        transaction.Commit();
                        return new OrderFinalizationRepository().Read(deliveryDate);
                    }
                    var allOrders = ReadOrders(connection, transaction, deliveryDate);
                    var active = new Dictionary<int, LegacyExportOrder>();
                    foreach (var order in allOrders)
                    {
                        if (!OrderDaySyncPolicy.BelongsInLegacy(order.Status)) continue;
                        if (order.Lines.Count == 0)
                            throw new InvalidOperationException("Ürünlü siparişin satırları eksik; gün aktarılmadı.");
                        active.Add(order.LegacyMbId, order);
                    }
                    var registry = ReadRegistry(connection, transaction, deliveryDate);
                    foreach (var pair in registry)
                    {
                        if (active.ContainsKey(pair.Key)) continue;
                        var old = pair.Value;
                        exporter.DeleteReceipt(old.ReceiptId, deliveryDate, old.CustomerId,
                            old.DepartmentId, connection, transaction, prefix);
                        using (var delete = new SqlCommand(@"
DELETE FROM dbo.MobileReceiptRegistry
WHERE LegacyReceiptId=@id AND DeliveryDate=@deliveryDate", connection, transaction))
                        {
                            delete.Parameters.Add("@id", SqlDbType.Int).Value = old.ReceiptId;
                            delete.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                            if (delete.ExecuteNonQuery() != 1)
                                throw new InvalidOperationException("Mobil fiş sahiplik kaydı silinemedi.");
                        }
                    }

                    foreach (var order in active.Values)
                    {
                        RegisteredReceipt registered;
                        var known = registry.TryGetValue(order.LegacyMbId, out registered);
                        if (known && (registered.CustomerId != order.LegacyCustomerId ||
                            registered.DepartmentId != order.LegacyDepartmentId ||
                            (order.LegacyReceiptId.HasValue &&
                             order.LegacyReceiptId.Value != registered.ReceiptId)))
                            throw new InvalidOperationException("Mobil fiş müşteri/şube bağlantısı değişmiş; gün aktarılmadı.");
                        if (!known && order.LegacyReceiptId.HasValue)
                            throw new InvalidOperationException("Kayıtlı mobil fişin sahiplik kaydı yok; gün aktarılmadı.");
                        if (known)
                            exporter.VerifyReceipt(registered.ReceiptId, deliveryDate,
                                registered.CustomerId, registered.DepartmentId,
                                connection, transaction, prefix);
                        var linesMatch = known && exporter.ReceiptLinesMatch(registered.ReceiptId,
                            order.Lines, connection, transaction, prefix);
                        if (!OrderDaySyncPolicy.NeedsReceiptWrite(known, order.Revision,
                            known ? registered.LastSyncedRevision : 0,
                            order.IntegrationStatus, linesMatch)) continue;

                        order.LegacyReceiptId = known ? (int?)registered.ReceiptId : null;
                        var receiptId = exporter.Export(order, connection, transaction, prefix);
                        if (known)
                        {
                            using (var update = new SqlCommand(@"
UPDATE dbo.MobileReceiptRegistry SET LastSyncedRevision=@revision, NeedsSync=0
WHERE LegacyReceiptId=@receiptId AND LegacyMbId=@mbId AND DeliveryDate=@deliveryDate",
                                connection, transaction))
                            {
                                AddRegistryParameters(update, order, receiptId);
                                if (update.ExecuteNonQuery() != 1)
                                    throw new InvalidOperationException("Mobil fiş sahipliği güncellenemedi.");
                            }
                        }
                        else
                        {
                            using (var insert = new SqlCommand(@"
INSERT INTO dbo.MobileReceiptRegistry
    (LegacyReceiptId, LegacyMbId, LegacyCustomerId, LegacyDepartmentId,
     DeliveryDate, LastSyncedRevision, NeedsSync)
VALUES (@receiptId,@mbId,@customer,@department,@deliveryDate,@revision,0)",
                                connection, transaction))
                            {
                                AddRegistryParameters(insert, order, receiptId);
                                insert.Parameters.Add("@customer", SqlDbType.Int).Value = order.LegacyCustomerId;
                                insert.Parameters.Add("@department", SqlDbType.Int).Value = order.LegacyDepartmentId;
                                insert.ExecuteNonQuery();
                            }
                        }
                        using (var update = new SqlCommand(@"
UPDATE dbo.Orders SET IntegrationStatus=N'EXPORTED', LegacyReceiptId=@receiptId,
    LastExportedAt=GETDATE(), LastExportedRevision=@revision
WHERE OrderId=@orderId AND Revision=@revision AND DeliveryDate=@deliveryDate",
                            connection, transaction))
                        {
                            update.Parameters.Add("@receiptId", SqlDbType.Int).Value = receiptId;
                            update.Parameters.Add("@revision", SqlDbType.Int).Value = order.Revision;
                            update.Parameters.Add("@orderId", SqlDbType.Int).Value = order.OrderId;
                            update.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                            if (update.ExecuteNonQuery() != 1)
                                throw new InvalidOperationException("Sipariş eşitleme sırasında değişti.");
                        }
                    }

                    foreach (var order in allOrders)
                    {
                        if (order.Status == "SUBMITTED") continue;
                        using (var update = new SqlCommand(@"
UPDATE dbo.Orders SET IntegrationStatus=N'NOT_REQUIRED', LegacyReceiptId=NULL,
    LastExportedAt=GETDATE(), LastExportedRevision=Revision
WHERE OrderId=@orderId AND Revision=@revision AND DeliveryDate=@deliveryDate",
                            connection, transaction))
                        {
                            update.Parameters.Add("@orderId", SqlDbType.Int).Value = order.OrderId;
                            update.Parameters.Add("@revision", SqlDbType.Int).Value = order.Revision;
                            update.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                            if (update.ExecuteNonQuery() != 1)
                                throw new InvalidOperationException("Ürünsüz sipariş eşitleme sırasında değişti.");
                        }
                    }

                    WriteFinalization(connection, transaction, userId, deliveryDate, active.Values);
                    if (closeDay)
                    {
                        using (var close = new SqlCommand(@"
UPDATE dbo.OrderFinalizations SET ClosedAt=GETDATE()
WHERE DeliveryDate=@date AND ClosedAt IS NULL", connection, transaction))
                        {
                            close.Parameters.Add("@date", SqlDbType.DateTime).Value = deliveryDate.Date;
                            if (close.ExecuteNonQuery() != 1)
                                throw new InvalidOperationException("Teslim günü kapatılamadı.");
                        }
                        PruneCompletedOldOrders(connection, transaction, deliveryDate);
                    }
                    transaction.Commit();
                }
            }
            return new OrderFinalizationRepository().Read(deliveryDate);
        }

        private static string VerifySameInstanceAndCatalogAccess()
        {
            var application = new SqlConnectionStringBuilder(DatabaseConnections.Application());
            var catalog = new SqlConnectionStringBuilder(DatabaseConnections.Catalog());
            if (String.IsNullOrWhiteSpace(application.InitialCatalog) ||
                String.IsNullOrWhiteSpace(catalog.InitialCatalog) ||
                String.Equals(application.InitialCatalog, catalog.InitialCatalog,
                    StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Ayrı ve tanımlı eski sistem veritabanı gerekli.");
            string appServer;
            string catalogServer;
            using (var app = new SqlConnection(application.ConnectionString))
            using (var old = new SqlConnection(catalog.ConnectionString))
            {
                app.Open(); old.Open();
                using (var command = new SqlCommand("SELECT CAST(SERVERPROPERTY('ServerName') AS NVARCHAR(256))", app))
                    appServer = Convert.ToString(command.ExecuteScalar());
                using (var command = new SqlCommand("SELECT CAST(SERVERPROPERTY('ServerName') AS NVARCHAR(256))", old))
                    catalogServer = Convert.ToString(command.ExecuteScalar());
                if (String.IsNullOrWhiteSpace(appServer) ||
                    !String.Equals(appServer, catalogServer, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Veritabanları aynı SQL Server instance'ında değil; atomik aktarım başlatılmadı.");
                using (var command = new SqlCommand("SELECT DB_ID(@catalog)", app))
                {
                    command.Parameters.Add("@catalog", SqlDbType.NVarChar, 128).Value = catalog.InitialCatalog;
                    if (command.ExecuteScalar() == DBNull.Value)
                        throw new InvalidOperationException("Uygulama bağlantısının eski veritabanına erişimi yok.");
                }
            }
            return catalog.InitialCatalog;
        }

        internal static DateTime? ReadClosedAt(SqlConnection connection,
            SqlTransaction transaction, DateTime date)
        {
            using (var command = new SqlCommand(@"
SELECT ClosedAt FROM dbo.OrderFinalizations WITH (UPDLOCK, HOLDLOCK)
WHERE DeliveryDate=@date", connection, transaction))
            {
                command.Parameters.Add("@date", SqlDbType.DateTime).Value = date.Date;
                var value = command.ExecuteScalar();
                return value == null || value == DBNull.Value ? (DateTime?)null : (DateTime)value;
            }
        }

        internal static void LockDay(SqlConnection connection, SqlTransaction transaction, DateTime date)
        {
            using (var command = new SqlCommand(@"
DECLARE @result INT;
EXEC @result=sp_getapplock @Resource=@resource, @LockMode='Exclusive',
     @LockOwner='Transaction', @LockTimeout=15000;
SELECT @result;", connection, transaction))
            {
                command.Parameters.Add("@resource", SqlDbType.NVarChar, 255).Value =
                    "YepasDeliveryDay-" + date.ToString("yyyyMMdd");
                if (Convert.ToInt32(command.ExecuteScalar()) < 0)
                    throw new InvalidOperationException("Teslim günü eşitleme kilidi alınamadı.");
            }
        }

        private static IList<LegacyExportOrder> ReadOrders(SqlConnection connection,
            SqlTransaction transaction, DateTime date)
        {
            var result = new List<LegacyExportOrder>();
            LegacyExportOrder current = null;
            using (var command = new SqlCommand(@"
SELECT O.OrderId,O.Revision,O.LegacyMbId,O.LegacyCustomerId,
       O.LegacyDepartmentId,O.LegacyPersonnelId,O.LegacyReceiptId,
       O.DeliveryDate,O.Status,O.UpdatedAt,O.IntegrationStatus,
       O.LastExportedRevision,L.UStokId,L.AStokId,L.Quantity,
       L.ProductCode,L.ProductName,L.VariantName
FROM dbo.Orders O WITH (UPDLOCK,HOLDLOCK)
LEFT JOIN dbo.OrderLines L ON L.OrderId=O.OrderId
WHERE O.DeliveryDate=@date
ORDER BY O.OrderId,L.OrderLineId", connection, transaction))
            {
                command.Parameters.Add("@date", SqlDbType.DateTime).Value = date.Date;
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var orderId = reader.GetInt32(0);
                        if (current == null || current.OrderId != orderId)
                        {
                            current = new LegacyExportOrder {
                                OrderId = orderId, Revision = reader.GetInt32(1),
                                LegacyMbId = reader.GetInt32(2), LegacyCustomerId = reader.GetInt32(3),
                                LegacyDepartmentId = reader.GetInt32(4), LegacyPersonnelId = reader.GetInt32(5),
                                LegacyReceiptId = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                                DeliveryDate = reader.GetDateTime(7), Status = reader.GetString(8),
                                UpdatedAtUtc = IstanbulTimestamp.ToUtc(reader.GetDateTime(9)),
                                IntegrationStatus = reader.GetString(10),
                                LastExportedRevision = reader.IsDBNull(11) ? (int?)null : reader.GetInt32(11),
                                Lines = new List<OrderLineView>()
                            };
                            result.Add(current);
                        }
                        if (!reader.IsDBNull(12)) current.Lines.Add(new OrderLineView {
                            UStokId = reader.GetInt32(12), AStokId = reader.GetInt32(13),
                            Quantity = reader.GetInt32(14), ProductCode = reader.GetString(15),
                            ProductName = reader.GetString(16),
                            VariantName = reader.IsDBNull(17) ? null : reader.GetString(17)
                        });
                    }
            }
            return result;
        }

        private static IDictionary<int, RegisteredReceipt> ReadRegistry(SqlConnection connection,
            SqlTransaction transaction, DateTime date)
        {
            var result = new Dictionary<int, RegisteredReceipt>();
            using (var command = new SqlCommand(@"
SELECT LegacyReceiptId,LegacyMbId,LegacyCustomerId,LegacyDepartmentId,LastSyncedRevision
FROM dbo.MobileReceiptRegistry WITH (UPDLOCK,HOLDLOCK)
WHERE DeliveryDate=@date", connection, transaction))
            {
                command.Parameters.Add("@date", SqlDbType.DateTime).Value = date.Date;
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var value = new RegisteredReceipt {
                            ReceiptId = reader.GetInt32(0), MbId = reader.GetInt32(1),
                            CustomerId = reader.GetInt32(2), DepartmentId = reader.GetInt32(3),
                            LastSyncedRevision = reader.GetInt32(4)
                        };
                        result.Add(value.MbId, value);
                    }
            }
            return result;
        }

        private static void AddRegistryParameters(SqlCommand command, LegacyExportOrder order, int receiptId)
        {
            command.Parameters.Add("@receiptId", SqlDbType.Int).Value = receiptId;
            command.Parameters.Add("@mbId", SqlDbType.Int).Value = order.LegacyMbId;
            command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = order.DeliveryDate.Date;
            command.Parameters.Add("@revision", SqlDbType.Int).Value = order.Revision;
        }

        private static void WriteFinalization(SqlConnection connection, SqlTransaction transaction,
            int? userId, DateTime date, ICollection<LegacyExportOrder> active)
        {
            var lines = 0;
            var quantity = 0;
            foreach (var order in active)
                foreach (var line in order.Lines) { lines++; quantity += line.Quantity; }
            using (var update = new SqlCommand(@"
UPDATE dbo.OrderFinalizations SET State=N'FINALIZED',OrderCount=@orders,
    LineCount=@lines,TotalQuantity=@quantity,AttemptCount=AttemptCount+1,
    LastAttemptAt=GETDATE(),FinalizedAt=GETDATE(),LastError=NULL
WHERE DeliveryDate=@date", connection, transaction))
            {
                AddFinalizationParameters(update, userId, date, active.Count, lines, quantity);
                if (update.ExecuteNonQuery() != 0) return;
            }
            using (var insert = new SqlCommand(@"
INSERT INTO dbo.OrderFinalizations
    (DeliveryDate,State,OrderCount,LineCount,TotalQuantity,
     AttemptCount,StartedByUserId,StartedAt,LastAttemptAt,FinalizedAt)
VALUES (@date,N'FINALIZED',@orders,@lines,@quantity,1,@userId,
        GETDATE(),GETDATE(),GETDATE())", connection, transaction))
            {
                AddFinalizationParameters(insert, userId, date, active.Count, lines, quantity);
                insert.ExecuteNonQuery();
            }
        }

        private static void AddFinalizationParameters(SqlCommand command, int? userId,
            DateTime date, int orders, int lines, int quantity)
        {
            command.Parameters.Add("@date", SqlDbType.DateTime).Value = date.Date;
            command.Parameters.Add("@orders", SqlDbType.Int).Value = orders;
            command.Parameters.Add("@lines", SqlDbType.Int).Value = lines;
            command.Parameters.Add("@quantity", SqlDbType.Int).Value = quantity;
            command.Parameters.Add("@userId", SqlDbType.Int).Value =
                userId.HasValue ? (object)userId.Value : DBNull.Value;
        }

        private static void PruneCompletedOldOrders(SqlConnection connection,
            SqlTransaction transaction, DateTime currentDeliveryDate)
        {
            // Başarısız veya eşitlenmemiş günleri asla zaman aşımıyla silme.
            // OrderAudit ve OrderIdempotency migration 010 ile bağımsız kalır.
            using (var command = new SqlCommand(@"
DELETE O FROM dbo.Orders O
WHERE O.DeliveryDate < @currentDate
  AND O.IntegrationStatus NOT IN (N'PENDING',N'FAILED')
  AND EXISTS (SELECT 1 FROM dbo.OrderFinalizations F
              WHERE F.DeliveryDate=O.DeliveryDate AND F.State=N'FINALIZED')
  AND NOT EXISTS (SELECT 1 FROM dbo.MobileReceiptRegistry R
                  WHERE R.DeliveryDate=O.DeliveryDate AND R.NeedsSync=1)",
                connection, transaction))
            {
                command.Parameters.Add("@currentDate", SqlDbType.DateTime).Value = currentDeliveryDate.Date;
                command.ExecuteNonQuery();
            }
        }
    }
}
