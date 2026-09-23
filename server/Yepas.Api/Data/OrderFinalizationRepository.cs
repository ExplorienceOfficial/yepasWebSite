using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class LegacyExportOrder
    {
        public int OrderId { get; set; }
        public int Revision { get; set; }
        public int LegacyMbId { get; set; }
        public int LegacyCustomerId { get; set; }
        public int LegacyDepartmentId { get; set; }
        public int LegacyPersonnelId { get; set; }
        public int? LegacyReceiptId { get; set; }
        public DateTime DeliveryDate { get; set; }
        public string Status { get; set; }
        public IList<OrderLineView> Lines { get; set; }
    }

    public sealed class OrderFinalizationRepository
    {
        public OrderFinalizationView Read(DateTime deliveryDate)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT FinalizationId, DeliveryDate, State, OrderCount, LineCount,
       TotalQuantity, AttemptCount, StartedAtUtc, FinalizedAtUtc, LastError
FROM dbo.OrderFinalizations WHERE DeliveryDate = @deliveryDate", connection))
            {
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                connection.Open();
                using (var reader = command.ExecuteReader()) return ReadView(reader);
            }
        }

        public OrderFinalizationView Begin(int userId, DateTime deliveryDate, out bool shouldExport)
        {
            shouldExport = false;
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    OrderFinalizationView existing;
                    using (var command = new SqlCommand(@"
SELECT FinalizationId, DeliveryDate, State, OrderCount, LineCount,
       TotalQuantity, AttemptCount, StartedAtUtc, FinalizedAtUtc, LastError
FROM dbo.OrderFinalizations WITH (UPDLOCK, HOLDLOCK)
WHERE DeliveryDate = @deliveryDate", connection, transaction))
                    {
                        command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                        using (var reader = command.ExecuteReader()) existing = ReadView(reader);
                    }
                    if (existing != null)
                    {
                        if (existing.State == "FINALIZED" &&
                            !HasPending(connection, transaction, deliveryDate))
                        {
                            transaction.Commit();
                            return existing;
                        }
                        int retryOrderCount;
                        int retryLineCount;
                        int retryTotalQuantity;
                        ReadTotals(connection, transaction, deliveryDate,
                            out retryOrderCount, out retryLineCount, out retryTotalQuantity);
                        using (var retry = new SqlCommand(@"
UPDATE dbo.OrderFinalizations
SET State=N'FINALIZING', AttemptCount=AttemptCount+1,
    OrderCount=@orders, LineCount=@lines, TotalQuantity=@quantity,
    LastAttemptAtUtc=GETUTCDATE(), FinalizedAtUtc=NULL, LastError=NULL
WHERE FinalizationId=@id
  AND (State=N'FAILED' OR State=N'FINALIZED' OR
       (State=N'FINALIZING' AND LastAttemptAtUtc<=DATEADD(minute,-5,GETUTCDATE())))", connection, transaction))
                        {
                            retry.Parameters.Add("@id", SqlDbType.Int).Value = existing.FinalizationId;
                            retry.Parameters.Add("@orders", SqlDbType.Int).Value = retryOrderCount;
                            retry.Parameters.Add("@lines", SqlDbType.Int).Value = retryLineCount;
                            retry.Parameters.Add("@quantity", SqlDbType.Int).Value = retryTotalQuantity;
                            if (retry.ExecuteNonQuery() != 1)
                            {
                                transaction.Commit();
                                return existing;
                            }
                        }
                        transaction.Commit();
                        shouldExport = true;
                        return Read(deliveryDate);
                    }

                    int orderCount;
                    int lineCount;
                    int totalQuantity;
                    ReadTotals(connection, transaction, deliveryDate, out orderCount, out lineCount, out totalQuantity);
                    using (var insert = new SqlCommand(@"
INSERT INTO dbo.OrderFinalizations
    (DeliveryDate, State, OrderCount, LineCount, TotalQuantity, StartedByUserId)
VALUES (@deliveryDate, N'FINALIZING', @orders, @lines, @quantity, @userId)", connection, transaction))
                    {
                        insert.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                        insert.Parameters.Add("@orders", SqlDbType.Int).Value = orderCount;
                        insert.Parameters.Add("@lines", SqlDbType.Int).Value = lineCount;
                        insert.Parameters.Add("@quantity", SqlDbType.Int).Value = totalQuantity;
                        insert.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                        insert.ExecuteNonQuery();
                    }
                    transaction.Commit();
                    shouldExport = true;
                    return Read(deliveryDate);
                }
            }
        }

        public IList<LegacyExportOrder> ReadPending(DateTime deliveryDate)
        {
            var orders = new Dictionary<int, LegacyExportOrder>();
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT O.OrderId, O.Revision, O.LegacyMbId, O.LegacyCustomerId,
       O.LegacyDepartmentId, O.LegacyPersonnelId, O.LegacyReceiptId,
       O.DeliveryDate, O.Status, L.UStokId, L.AStokId, L.Quantity,
       L.ProductCode, L.ProductName, L.VariantName
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId=O.OrderId
WHERE O.DeliveryDate=@deliveryDate AND O.IntegrationStatus=N'PENDING'
ORDER BY O.OrderId,L.OrderLineId", connection))
            {
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var orderId = reader.GetInt32(0);
                        LegacyExportOrder order;
                        if (!orders.TryGetValue(orderId, out order))
                        {
                            order = new LegacyExportOrder {
                                OrderId=orderId, Revision=reader.GetInt32(1), LegacyMbId=reader.GetInt32(2),
                                LegacyCustomerId=reader.GetInt32(3), LegacyDepartmentId=reader.GetInt32(4),
                                LegacyPersonnelId=reader.GetInt32(5),
                                LegacyReceiptId=reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                                DeliveryDate=reader.GetDateTime(7), Status=reader.GetString(8),
                                Lines=new List<OrderLineView>()
                            };
                            orders.Add(orderId, order);
                        }
                        if (!reader.IsDBNull(9)) order.Lines.Add(new OrderLineView {
                            UStokId=reader.GetInt32(9), AStokId=reader.GetInt32(10), Quantity=reader.GetInt32(11),
                            ProductCode=reader.GetString(12), ProductName=reader.GetString(13),
                            VariantName=reader.IsDBNull(14) ? null : reader.GetString(14)
                        });
                    }
            }
            return new List<LegacyExportOrder>(orders.Values);
        }

        public void MarkExported(LegacyExportOrder order, int receiptId)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
UPDATE dbo.Orders SET IntegrationStatus=N'EXPORTED', LegacyReceiptId=@receiptId,
    LastExportedAtUtc=GETUTCDATE(), LastExportedRevision=@revision
WHERE OrderId=@orderId AND Revision=@revision AND IntegrationStatus=N'PENDING'", connection))
            {
                command.Parameters.Add("@receiptId", SqlDbType.Int).Value = receiptId;
                command.Parameters.Add("@orderId", SqlDbType.Int).Value = order.OrderId;
                command.Parameters.Add("@revision", SqlDbType.Int).Value = order.Revision;
                connection.Open();
                if (command.ExecuteNonQuery() != 1)
                    throw new InvalidOperationException("Sipariş aktarım sırasında değişti.");
            }
        }

        public OrderFinalizationView Complete(int id, DateTime deliveryDate)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
UPDATE dbo.OrderFinalizations
SET State=N'FINALIZED', FinalizedAtUtc=GETUTCDATE(), LastError=NULL
WHERE FinalizationId=@id AND State=N'FINALIZING'
  AND NOT EXISTS (SELECT 1 FROM dbo.Orders
                  WHERE DeliveryDate=@deliveryDate
                    AND IntegrationStatus=N'PENDING')", connection))
            {
                command.Parameters.Add("@id", SqlDbType.Int).Value = id;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                connection.Open();
                if (command.ExecuteNonQuery() != 1)
                    throw new InvalidOperationException("Tüm siparişler eski sisteme aktarılamadı.");
            }
            return Read(deliveryDate);
        }

        private static bool HasPending(SqlConnection connection, SqlTransaction transaction,
            DateTime deliveryDate)
        {
            using (var command = new SqlCommand(@"
SELECT TOP 1 OrderId
FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK)
WHERE DeliveryDate=@deliveryDate AND IntegrationStatus=N'PENDING'", connection, transaction))
            {
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                return command.ExecuteScalar() != null;
            }
        }

        public void Fail(int id, string message)
        {
            if (message != null && message.Length > 500) message = message.Substring(0, 500);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
UPDATE dbo.OrderFinalizations SET State=N'FAILED', LastError=@message
WHERE FinalizationId=@id AND State=N'FINALIZING'", connection))
            {
                command.Parameters.Add("@id", SqlDbType.Int).Value = id;
                command.Parameters.Add("@message", SqlDbType.NVarChar, 500).Value =
                    String.IsNullOrWhiteSpace(message) ? (object)DBNull.Value : message;
                connection.Open();
                command.ExecuteNonQuery();
            }
        }

        private static OrderFinalizationView ReadView(SqlDataReader reader)
        {
            if (!reader.Read()) return null;
            return new OrderFinalizationView {
                FinalizationId=reader.GetInt32(0), DeliveryDate=reader.GetDateTime(1), State=reader.GetString(2),
                OrderCount=reader.GetInt32(3), LineCount=reader.GetInt32(4), TotalQuantity=reader.GetInt32(5),
                AttemptCount=reader.GetInt32(6), StartedAtUtc=reader.GetDateTime(7),
                FinalizedAtUtc=reader.IsDBNull(8) ? (DateTime?)null : reader.GetDateTime(8),
                LastError=reader.IsDBNull(9) ? null : reader.GetString(9)
            };
        }

        private static void ReadTotals(SqlConnection connection, SqlTransaction transaction,
            DateTime deliveryDate, out int orders, out int lines, out int quantity)
        {
            using (var command = new SqlCommand(@"
SELECT COUNT(DISTINCT O.OrderId), COUNT(L.OrderLineId), ISNULL(SUM(L.Quantity),0)
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId=O.OrderId
WHERE O.DeliveryDate=@deliveryDate AND O.Status=N'SUBMITTED'", connection, transaction))
            {
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                using (var reader = command.ExecuteReader())
                {
                    reader.Read(); orders=reader.GetInt32(0); lines=reader.GetInt32(1); quantity=reader.GetInt32(2);
                }
            }
        }
    }
}
