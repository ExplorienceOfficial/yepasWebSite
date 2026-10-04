using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class AdminOrderBoardRepository
    {
        private sealed class LegacyBranch
        {
            public AdminOrderRowView Row { get; set; }
            public bool[] Days { get; set; }
        }

        private sealed class OrderRecord
        {
            public OrderView Order { get; set; }
            public int CustomerId { get; set; }
            public int DepartmentId { get; set; }
            public int PersonnelId { get; set; }
            public string IntegrationStatus { get; set; }
            public string SourceRole { get; set; }
            public DateTime? RowLastExportedAtUtc { get; set; }
        }

        private sealed class RemovedRecord
        {
            public string Status { get; set; }
            public string SourceRole { get; set; }
            public string IntegrationStatus { get; set; }
            public DateTime OccurredAtUtc { get; set; }
        }

        public AdminOrderBoardView Read(string scope)
        {
            scope = String.IsNullOrWhiteSpace(scope) ? "submitted" : scope.Trim().ToLowerInvariant();
            if (scope != "delivery" && scope != "submitted")
                throw new ArgumentException("Kapsam delivery veya submitted olmalıdır.");

            DateTime generatedAtUtc;
            var localDate = ReadDatabaseLocalDate(out generatedAtUtc);
            var expectedDelivery = scope == "delivery" ? localDate : localDate.AddDays(1);
            var warnings = new List<string>();

            // Kaynaklar tek tek okunur: biri bozulursa ekran çökmez, eksik bölüm
            // uyarı olarak bildirilir ve erişilebilen veriler gösterilir.
            IList<LegacyBranch> branches;
            var skippedBranches = 0;
            try { branches = ReadBranches(out skippedBranches); }
            catch (Exception)
            {
                branches = new List<LegacyBranch>();
                warnings.Add("Eski sistemdeki şube bilgilerine erişilemedi; yalnızca sipariş kaydı olan şubeler listelendi.");
            }
            if (skippedBranches > 0)
                warnings.Add(skippedBranches + " şube kaydı eski sistemde okunamadı ve listeye alınmadı.");

            IDictionary<int, OrderRecord> orders;
            try { orders = ReadOrders(scope, localDate, expectedDelivery); }
            catch (Exception)
            {
                if (branches.Count == 0) throw;
                orders = new Dictionary<int, OrderRecord>();
                warnings.Add("Sipariş tablosuna erişilemedi; şubeler sipariş durumu olmadan listelendi.");
            }

            IDictionary<int, RemovedRecord> removed;
            try { removed = ReadRemovedOrders(scope, localDate, expectedDelivery); }
            catch (Exception)
            {
                removed = new Dictionary<int, RemovedRecord>();
                warnings.Add("Ürün istemeyen müşterilerin işlem geçmişi okunamadı.");
            }

            var rows = new List<AdminOrderRowView>();
            var included = new HashSet<int>();
            var dayIndex = DayIndex(expectedDelivery.DayOfWeek);

            foreach (var branch in branches)
            {
                OrderRecord record;
                var hasOrder = orders.TryGetValue(branch.Row.LegacyMbId, out record);
                RemovedRecord removal;
                var hasRemoval = removed.TryGetValue(branch.Row.LegacyMbId, out removal);
                if (!branch.Days[dayIndex] && !hasOrder && !hasRemoval) continue;
                Attach(branch.Row, record);
                if (!hasOrder && hasRemoval) AttachRemoval(branch.Row, removal);
                rows.Add(branch.Row);
                included.Add(branch.Row.LegacyMbId);
            }

            foreach (var pair in orders)
            {
                if (included.Contains(pair.Key)) continue;
                var record = pair.Value;
                var row = new AdminOrderRowView {
                    LegacyMbId = pair.Key,
                    LegacyCustomerId = record.CustomerId,
                    LegacyDepartmentId = record.DepartmentId,
                    LegacyPersonnelId = record.PersonnelId,
                    CustomerCode = String.Empty,
                    CustomerName = "Eski sistem kaydı bulunamadı",
                    DepartmentName = "Bölüm " + record.DepartmentId,
                    PersonnelName = "Personel " + record.PersonnelId
                };
                Attach(row, record);
                rows.Add(row);
                included.Add(pair.Key);
            }

            foreach (var pair in removed)
            {
                if (included.Contains(pair.Key)) continue;
                var row = new AdminOrderRowView {
                    LegacyMbId = pair.Key,
                    CustomerName = "Eski sistem kaydı bulunamadı",
                    CustomerCode = String.Empty,
                    DepartmentName = String.Empty,
                    PersonnelName = String.Empty
                };
                AttachRemoval(row, pair.Value);
                rows.Add(row);
            }

            rows.Sort((left, right) => {
                var result = String.Compare(left.CustomerName, right.CustomerName,
                    StringComparison.CurrentCultureIgnoreCase);
                return result != 0 ? result : left.LegacyMbId.CompareTo(right.LegacyMbId);
            });
            OrderFinalizationView finalization = null;
            try { finalization = new OrderFinalizationRepository().Read(expectedDelivery); }
            catch (Exception)
            {
                warnings.Add("Aktarım durumu okunamadı; sipariş listesi etkilenmedi.");
            }

            var pendingSyncCount = 0;
            try { pendingSyncCount = ReadPendingSyncCount(expectedDelivery); }
            catch (Exception)
            {
                pendingSyncCount = rows.FindAll(row => row.IntegrationStatus == "PENDING" ||
                    row.IntegrationStatus == "FAILED").Count;
                warnings.Add("Günlük aktarım sayısı okunamadı; görünen satırlar sayıldı.");
            }

            return new AdminOrderBoardView {
                Scope = scope,
                LocalDate = localDate,
                ExpectedDeliveryDate = expectedDelivery,
                GeneratedAtUtc = generatedAtUtc,
                Rows = rows,
                Finalization = finalization,
                PendingSyncCount = pendingSyncCount,
                Warnings = warnings
            };
        }

        public OrderSyncStatusView ReadSyncStatus()
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT (SELECT COUNT(*) FROM dbo.Orders
        WHERE DeliveryDate>=DATEADD(day,DATEDIFF(day,0,GETDATE()),0)
          AND DeliveryDate<DATEADD(day,2,DATEADD(day,DATEDIFF(day,0,GETDATE()),0))
          AND IntegrationStatus IN (N'PENDING',N'FAILED')) +
       (SELECT COUNT(*) FROM dbo.MobileReceiptRegistry R
        WHERE R.DeliveryDate>=DATEADD(day,DATEDIFF(day,0,GETDATE()),0)
          AND R.DeliveryDate<DATEADD(day,2,DATEADD(day,DATEDIFF(day,0,GETDATE()),0))
          AND R.NeedsSync=1
          AND NOT EXISTS (SELECT 1 FROM dbo.Orders O
                          WHERE O.LegacyMbId=R.LegacyMbId
                            AND O.DeliveryDate=R.DeliveryDate
                            AND O.IntegrationStatus IN (N'PENDING',N'FAILED'))),
       (SELECT MAX(FinalizedAt) FROM dbo.OrderFinalizations
        WHERE State=N'FINALIZED'), GETUTCDATE()", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    reader.Read();
                    return new OrderSyncStatusView {
                        PendingCount = reader.GetInt32(0),
                        LastExportedAtUtc = reader.IsDBNull(1) ? (DateTime?)null : IstanbulTimestamp.ToUtc(reader.GetDateTime(1)),
                        GeneratedAtUtc = DateTime.SpecifyKind(reader.GetDateTime(2), DateTimeKind.Utc)
                    };
                }
            }
        }

        private static DateTime ReadDatabaseLocalDate(out DateTime generatedAtUtc)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand("SELECT GETDATE(), GETUTCDATE()", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) throw new InvalidOperationException("SQL sunucu saati okunamadı.");
                    generatedAtUtc = DateTime.SpecifyKind(reader.GetDateTime(1), DateTimeKind.Utc);
                    return reader.GetDateTime(0).Date;
                }
            }
        }

        private static int ReadPendingSyncCount(DateTime deliveryDate)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT (SELECT COUNT(*) FROM dbo.Orders
        WHERE DeliveryDate=@date AND IntegrationStatus IN (N'PENDING',N'FAILED')) +
       (SELECT COUNT(*) FROM dbo.MobileReceiptRegistry R
        WHERE R.DeliveryDate=@date AND R.NeedsSync=1
          AND NOT EXISTS (SELECT 1 FROM dbo.Orders O
                          WHERE O.LegacyMbId=R.LegacyMbId
                            AND O.DeliveryDate=R.DeliveryDate
                            AND O.IntegrationStatus IN (N'PENDING',N'FAILED')))", connection))
            {
                command.Parameters.Add("@date", SqlDbType.DateTime).Value = deliveryDate.Date;
                connection.Open();
                return Convert.ToInt32(command.ExecuteScalar());
            }
        }

        private static IDictionary<int, RemovedRecord> ReadRemovedOrders(string scope,
            DateTime localDate, DateTime deliveryDate)
        {
            var result = new Dictionary<int, RemovedRecord>();
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT A.LegacyMbId,A.Status,A.ActorRole,R.NeedsSync,A.OccurredAt
FROM dbo.OrderAudit A
LEFT JOIN dbo.MobileReceiptRegistry R
  ON R.LegacyMbId=A.LegacyMbId AND R.DeliveryDate=A.DeliveryDate
WHERE A.DeliveryDate=@date AND A.ActionCode=N'REMOVED'
  AND A.AuditId=(SELECT MAX(A2.AuditId) FROM dbo.OrderAudit A2
                 WHERE A2.LegacyMbId=A.LegacyMbId AND A2.DeliveryDate=A.DeliveryDate)
  AND (@scope=N'delivery' OR (A.OccurredAt>=@localStart AND A.OccurredAt<@localEnd))",
                connection))
            {
                command.Parameters.Add("@date", SqlDbType.DateTime).Value = deliveryDate.Date;
                command.Parameters.Add("@scope", SqlDbType.NVarChar, 10).Value = scope;
                command.Parameters.Add("@localStart", SqlDbType.DateTime).Value = localDate;
                command.Parameters.Add("@localEnd", SqlDbType.DateTime).Value = localDate.AddDays(1);
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var mbId = reader.GetInt32(0);
                        result.Add(mbId, new RemovedRecord {
                            Status = reader.GetString(1),
                            SourceRole = reader.GetString(2),
                            IntegrationStatus = !reader.IsDBNull(3) && reader.GetBoolean(3)
                                ? "PENDING" : "NOT_REQUIRED",
                            OccurredAtUtc = IstanbulTimestamp.ToUtc(reader.GetDateTime(4))
                        });
                    }
            }
            return result;
        }

        private static IList<LegacyBranch> ReadBranches(out int skipped)
        {
            skipped = 0;
            var branches = new List<LegacyBranch>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID, MB.PERSONEL_ID,
       M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI,
       LTRIM(RTRIM(ISNULL(P.PERSONEL_ADI, '') + ' ' + ISNULL(P.PERSONEL_SOYADI, ''))),
       MB.SG_1, MB.SG_2, MB.SG_3, MB.SG_4, MB.SG_5, MB.SG_6, MB.SG_7
FROM D00013.RS_MUSTERI_BILGILERI MB
INNER JOIN D00013.MUSTERILER M ON M.MUSTERI_ID = MB.MUSTERI_ID
INNER JOIN D00013.BF_MUST_BOLUM B
    ON B.MUSTERI_ID = MB.MUSTERI_ID AND B.BOLUM_ID = MB.BOLUM_ID
LEFT JOIN D00013.FIRMA_PERSONELI P ON P.PERSONEL_ID = MB.PERSONEL_ID
WHERE MB.SS = 12", connection))
            {
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        // Tek bir bozuk eski sistem satırı tüm listeyi düşürmemelidir.
                        try
                        {
                            var days = new bool[7];
                            for (var index = 0; index < 7; index++)
                                days[index] = String.Equals(Convert.ToString(reader.GetValue(8 + index)).Trim(), "+",
                                    StringComparison.Ordinal);
                            branches.Add(new LegacyBranch {
                                Row = new AdminOrderRowView {
                                    LegacyMbId = reader.GetInt32(0),
                                    LegacyCustomerId = reader.GetInt32(1),
                                    LegacyDepartmentId = reader.GetInt32(2),
                                    LegacyPersonnelId = reader.GetInt32(3),
                                    CustomerCode = Convert.ToString(reader.GetValue(4)).Trim(),
                                    CustomerName = Convert.ToString(reader.GetValue(5)).Trim(),
                                    DepartmentName = Convert.ToString(reader.GetValue(6)).Trim(),
                                    PersonnelName = Convert.ToString(reader.GetValue(7)).Trim(),
                                    BoardStatus = "PENDING"
                                },
                                Days = days
                            });
                        }
                        catch (Exception) { skipped++; }
                    }
            }
            return branches;
        }

        private static IDictionary<int, OrderRecord> ReadOrders(string scope,
            DateTime localDate, DateTime deliveryDate)
        {
            var records = new Dictionary<int, OrderRecord>();
            var localEnd = localDate.AddDays(1);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT O.OrderId, O.LegacyMbId, O.LegacyCustomerId, O.LegacyDepartmentId,
       O.LegacyPersonnelId, O.DeliveryDate, O.Status, O.Revision, O.Note,
       O.UpdatedAt, O.IntegrationStatus, O.SourceRole, O.LastExportedAt,
       L.UStokId, L.AStokId, L.Quantity, L.ProductCode, L.ProductName, L.VariantName
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId = O.OrderId
WHERE (@scope = N'delivery' AND O.DeliveryDate = @deliveryDate)
   OR (@scope = N'submitted' AND O.CreatedAt >= @localStart AND O.CreatedAt < @localEnd)
ORDER BY O.UpdatedAt DESC, O.OrderId, L.ProductName, L.VariantName", connection))
            {
                command.Parameters.Add("@scope", SqlDbType.NVarChar, 10).Value = scope;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate;
                command.Parameters.Add("@localStart", SqlDbType.DateTime).Value = localDate;
                command.Parameters.Add("@localEnd", SqlDbType.DateTime).Value = localEnd;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var mbId = reader.GetInt32(1);
                        OrderRecord record;
                        if (!records.TryGetValue(mbId, out record))
                        {
                            record = new OrderRecord {
                                CustomerId = reader.GetInt32(2),
                                DepartmentId = reader.GetInt32(3),
                                PersonnelId = reader.GetInt32(4),
                                IntegrationStatus = reader.GetString(10),
                                SourceRole = reader.GetString(11),
                                Order = new OrderView {
                                    OrderId = reader.GetInt32(0),
                                    LegacyMbId = mbId,
                                    DeliveryDate = reader.GetDateTime(5),
                                    Status = reader.GetString(6),
                                    Revision = reader.GetInt32(7),
                                    Note = reader.IsDBNull(8) ? null : reader.GetString(8),
                                    UpdatedAtUtc = IstanbulTimestamp.ToUtc(reader.GetDateTime(9)),
                                    Lines = new List<OrderLineView>()
                                }
                            };
                            record.RowLastExportedAtUtc = reader.IsDBNull(12)
                                ? (DateTime?)null : IstanbulTimestamp.ToUtc(reader.GetDateTime(12));
                            records.Add(mbId, record);
                        }
                        if (!reader.IsDBNull(13) && record.Order.OrderId == reader.GetInt32(0))
                            record.Order.Lines.Add(new OrderLineView {
                                UStokId = reader.GetInt32(13),
                                AStokId = reader.GetInt32(14),
                                Quantity = reader.GetInt32(15),
                                ProductCode = reader.GetString(16),
                                ProductName = reader.GetString(17),
                                VariantName = reader.IsDBNull(18) ? null : reader.GetString(18)
                            });
                    }
            }
            return records;
        }

        private static void Attach(AdminOrderRowView row, OrderRecord record)
        {
            if (record == null) {
                row.BoardStatus = "PENDING";
                return;
            }
            row.Order = record.Order;
            row.BoardStatus = record.Order.Status;
            row.IntegrationStatus = record.IntegrationStatus;
            row.SourceRole = record.SourceRole;
            row.LastExportedAtUtc = record.RowLastExportedAtUtc;
            row.LastActionAtUtc = record.Order.UpdatedAtUtc;
        }

        private static void AttachRemoval(AdminOrderRowView row, RemovedRecord record)
        {
            row.BoardStatus = record.Status;
            row.IntegrationStatus = record.IntegrationStatus;
            row.SourceRole = record.SourceRole;
            row.LastActionAtUtc = record.OccurredAtUtc;
        }

        private static int DayIndex(DayOfWeek day)
        {
            return day == DayOfWeek.Sunday ? 6 : (int)day - 1;
        }
    }
}
