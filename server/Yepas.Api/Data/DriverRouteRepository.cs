using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class DriverRouteRepository
    {
        public DriverRouteView Read(int personnelId, string scope)
        {
            scope = String.IsNullOrWhiteSpace(scope) ? "delivery" : scope.Trim().ToLowerInvariant();
            if (scope != "delivery" && scope != "submitted")
                throw new ArgumentException("Kapsam delivery veya submitted olmalıdır.");

            var localDate = DateTime.UtcNow.AddHours(3).Date;
            var stops = ReadStops(personnelId);
            var orders = ReadOrders(personnelId, scope, localDate);
            foreach (var stop in stops)
            {
                OrderView order;
                if (orders.TryGetValue(stop.LegacyMbId, out order)) stop.Order = order;
            }

            return new DriverRouteView {
                LegacyPersonnelId = personnelId,
                Scope = scope,
                LocalDate = localDate,
                GeneratedAtUtc = DateTime.UtcNow,
                Stops = stops
            };
        }

        private static IList<DriverRouteStopView> ReadStops(int personnelId)
        {
            var stops = new List<DriverRouteStopView>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID,
       M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI
FROM D00013.RS_MUSTERI_BILGILERI MB
INNER JOIN D00013.MUSTERILER M ON M.MUSTERI_ID = MB.MUSTERI_ID
INNER JOIN D00013.BF_MUST_BOLUM B
    ON B.MUSTERI_ID = MB.MUSTERI_ID AND B.BOLUM_ID = MB.BOLUM_ID
WHERE MB.PERSONEL_ID = @personnel
ORDER BY M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI, MB.ID", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        stops.Add(new DriverRouteStopView {
                            LegacyMbId = reader.GetInt32(0),
                            LegacyCustomerId = reader.GetInt32(1),
                            LegacyDepartmentId = reader.GetInt32(2),
                            CustomerCode = Convert.ToString(reader.GetValue(3)).Trim(),
                            CustomerName = Convert.ToString(reader.GetValue(4)).Trim(),
                            DepartmentName = Convert.ToString(reader.GetValue(5)).Trim()
                        });
            }
            return stops;
        }

        private static IDictionary<int, OrderView> ReadOrders(int personnelId, string scope,
            DateTime localDate)
        {
            var orders = new Dictionary<int, OrderView>();
            var utcStart = localDate.AddHours(-3);
            var utcEnd = utcStart.AddDays(1);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT O.OrderId, O.LegacyMbId, O.DeliveryDate, O.Status, O.Revision,
       O.Note, O.UpdatedAtUtc, L.UStokId, L.AStokId, L.Quantity,
       L.ProductCode, L.ProductName, L.VariantName
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId = O.OrderId
WHERE O.LegacyPersonnelId = @personnel
  AND ((@scope = N'delivery' AND O.DeliveryDate = @localDate)
       OR (@scope = N'submitted' AND O.CreatedAtUtc >= @utcStart
                                  AND O.CreatedAtUtc < @utcEnd))
ORDER BY O.UpdatedAtUtc DESC, O.OrderId, L.ProductName, L.VariantName", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                command.Parameters.Add("@scope", SqlDbType.NVarChar, 10).Value = scope;
                command.Parameters.Add("@localDate", SqlDbType.DateTime).Value = localDate;
                command.Parameters.Add("@utcStart", SqlDbType.DateTime).Value = utcStart;
                command.Parameters.Add("@utcEnd", SqlDbType.DateTime).Value = utcEnd;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var mbId = reader.GetInt32(1);
                        OrderView order;
                        if (!orders.TryGetValue(mbId, out order))
                        {
                            order = new OrderView {
                                OrderId = reader.GetInt32(0),
                                LegacyMbId = mbId,
                                DeliveryDate = reader.GetDateTime(2),
                                Status = reader.GetString(3),
                                Revision = reader.GetInt32(4),
                                Note = reader.IsDBNull(5) ? null : reader.GetString(5),
                                UpdatedAtUtc = reader.GetDateTime(6),
                                Lines = new List<OrderLineView>()
                            };
                            orders.Add(mbId, order);
                        }
                        if (!reader.IsDBNull(7) && order.OrderId == reader.GetInt32(0))
                            order.Lines.Add(new OrderLineView {
                                UStokId = reader.GetInt32(7),
                                AStokId = reader.GetInt32(8),
                                Quantity = reader.GetInt32(9),
                                ProductCode = reader.GetString(10),
                                ProductName = reader.GetString(11),
                                VariantName = reader.IsDBNull(12) ? null : reader.GetString(12)
                            });
                    }
            }
            return orders;
        }
    }
}
