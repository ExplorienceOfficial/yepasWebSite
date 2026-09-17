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
        }

        public AdminOrderBoardView Read(string scope)
        {
            scope = String.IsNullOrWhiteSpace(scope) ? "submitted" : scope.Trim().ToLowerInvariant();
            if (scope != "delivery" && scope != "submitted")
                throw new ArgumentException("Kapsam delivery veya submitted olmalıdır.");

            var localDate = DateTime.UtcNow.AddHours(3).Date;
            var expectedDelivery = scope == "delivery" ? localDate : localDate.AddDays(1);
            var branches = ReadBranches();
            var orders = ReadOrders(scope, localDate, expectedDelivery);
            var rows = new List<AdminOrderRowView>();
            var included = new HashSet<int>();
            var dayIndex = DayIndex(expectedDelivery.DayOfWeek);

            foreach (var branch in branches)
            {
                OrderRecord record;
                var hasOrder = orders.TryGetValue(branch.Row.LegacyMbId, out record);
                if (!branch.Days[dayIndex] && !hasOrder) continue;
                Attach(branch.Row, record);
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
            }

            rows.Sort((left, right) => {
                var result = String.Compare(left.CustomerName, right.CustomerName,
                    StringComparison.CurrentCultureIgnoreCase);
                return result != 0 ? result : left.LegacyMbId.CompareTo(right.LegacyMbId);
            });
            return new AdminOrderBoardView {
                Scope = scope,
                LocalDate = localDate,
                ExpectedDeliveryDate = expectedDelivery,
                GeneratedAtUtc = DateTime.UtcNow,
                Rows = rows
            };
        }

        private static IList<LegacyBranch> ReadBranches()
        {
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
            }
            return branches;
        }

        private static IDictionary<int, OrderRecord> ReadOrders(string scope,
            DateTime localDate, DateTime deliveryDate)
        {
            var records = new Dictionary<int, OrderRecord>();
            var utcStart = localDate.AddHours(-3);
            var utcEnd = utcStart.AddDays(1);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT O.OrderId, O.LegacyMbId, O.LegacyCustomerId, O.LegacyDepartmentId,
       O.LegacyPersonnelId, O.DeliveryDate, O.Status, O.Revision, O.Note,
       O.UpdatedAtUtc, O.IntegrationStatus, O.SourceRole,
       L.UStokId, L.AStokId, L.Quantity, L.ProductCode, L.ProductName, L.VariantName
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId = O.OrderId
WHERE (@scope = N'delivery' AND O.DeliveryDate = @deliveryDate)
   OR (@scope = N'submitted' AND O.CreatedAtUtc >= @utcStart AND O.CreatedAtUtc < @utcEnd)
ORDER BY O.UpdatedAtUtc DESC, O.OrderId, L.ProductName, L.VariantName", connection))
            {
                command.Parameters.Add("@scope", SqlDbType.NVarChar, 10).Value = scope;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate;
                command.Parameters.Add("@utcStart", SqlDbType.DateTime).Value = utcStart;
                command.Parameters.Add("@utcEnd", SqlDbType.DateTime).Value = utcEnd;
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
                                    UpdatedAtUtc = reader.GetDateTime(9),
                                    Lines = new List<OrderLineView>()
                                }
                            };
                            records.Add(mbId, record);
                        }
                        if (!reader.IsDBNull(12) && record.Order.OrderId == reader.GetInt32(0))
                            record.Order.Lines.Add(new OrderLineView {
                                UStokId = reader.GetInt32(12),
                                AStokId = reader.GetInt32(13),
                                Quantity = reader.GetInt32(14),
                                ProductCode = reader.GetString(15),
                                ProductName = reader.GetString(16),
                                VariantName = reader.IsDBNull(17) ? null : reader.GetString(17)
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
        }

        private static int DayIndex(DayOfWeek day)
        {
            return day == DayOfWeek.Sunday ? 6 : (int)day - 1;
        }
    }
}
