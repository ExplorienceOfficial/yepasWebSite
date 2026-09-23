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
            var deliveryDate = scope == "delivery" ? localDate : localDate.AddDays(1);
            string personnelCode;
            string personnelName;
            ReadPersonnel(personnelId, out personnelCode, out personnelName);
            var stops = ReadStops(personnelId, deliveryDate);
            var orders = ReadOrders(stops, scope, localDate, deliveryDate);
            foreach (var stop in stops)
            {
                OrderView order;
                if (orders.TryGetValue(BranchKey(stop.LegacyCustomerId,
                    stop.LegacyDepartmentId), out order)) stop.Order = order;
            }

            return new DriverRouteView {
                LegacyPersonnelId = personnelId,
                PersonnelCode = personnelCode,
                PersonnelName = personnelName,
                Scope = scope,
                LocalDate = localDate,
                DeliveryDate = deliveryDate,
                GeneratedAtUtc = DateTime.UtcNow,
                Stops = stops
            };
        }

        private static void ReadPersonnel(int personnelId, out string code, out string name)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
SELECT P.PERSONEL_KODU,
       LTRIM(RTRIM(ISNULL(P.PERSONEL_ADI, '') + ' ' + ISNULL(P.PERSONEL_SOYADI, '')))
FROM D00013.FIRMA_PERSONELI P
WHERE P.PERSONEL_ID = @personnel", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) throw new InvalidOperationException("Şoför eski sistemde bulunamadı.");
                    code = Convert.ToString(reader.GetValue(0)).Trim();
                    name = Convert.ToString(reader.GetValue(1)).Trim();
                }
            }
        }

        private static IList<DriverRouteStopView> ReadStops(int personnelId, DateTime deliveryDate)
        {
            var stops = new List<DriverRouteStopView>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(@"
;WITH RouteCandidates AS (
    SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID,
           MB.SG_1, MB.SG_2, MB.SG_3, MB.SG_4, MB.SG_5, MB.SG_6, MB.SG_7,
           ROW_NUMBER() OVER (
               PARTITION BY PM.PERSONEL_ID, PM.MUSTERI_ID, PM.BOLUM_ID
               ORDER BY CASE WHEN MB.PERSONEL_ID = PM.PERSONEL_ID THEN 0 ELSE 1 END,
                        MB.ID DESC) AS ROUTE_ROW
    FROM D00013.BF_PERS_MUST PM
    INNER JOIN D00013.RS_MUSTERI_BILGILERI MB
        ON MB.MUSTERI_ID = PM.MUSTERI_ID
       AND MB.BOLUM_ID = PM.BOLUM_ID
    WHERE PM.PERSONEL_ID = @personnel
      AND MB.SS = 12
)
SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID,
       M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI
FROM RouteCandidates MB
INNER JOIN D00013.MUSTERILER M ON M.MUSTERI_ID = MB.MUSTERI_ID
INNER JOIN D00013.BF_MUST_BOLUM B
    ON B.MUSTERI_ID = MB.MUSTERI_ID AND B.BOLUM_ID = MB.BOLUM_ID
WHERE MB.ROUTE_ROW = 1
  AND ((@day = 1 AND MB.SG_1 = '+') OR
       (@day = 2 AND MB.SG_2 = '+') OR
       (@day = 3 AND MB.SG_3 = '+') OR
       (@day = 4 AND MB.SG_4 = '+') OR
       (@day = 5 AND MB.SG_5 = '+') OR
       (@day = 6 AND MB.SG_6 = '+') OR
       (@day = 7 AND MB.SG_7 = '+'))
ORDER BY M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI, MB.ID", connection))
            {
                command.Parameters.Add("@personnel", SqlDbType.Int).Value = personnelId;
                var day = deliveryDate.DayOfWeek == DayOfWeek.Sunday
                    ? 7 : (int)deliveryDate.DayOfWeek;
                command.Parameters.Add("@day", SqlDbType.Int).Value = day;
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

        private static IDictionary<string, OrderView> ReadOrders(
            IList<DriverRouteStopView> stops, string scope,
            DateTime localDate, DateTime deliveryDate)
        {
            var orders = new Dictionary<string, OrderView>(StringComparer.Ordinal);
            if (stops.Count == 0) return orders;

            var routeFilters = new List<string>();
            for (var index = 0; index < stops.Count; index++)
                routeFilters.Add("(O.LegacyCustomerId = @customer" + index +
                    " AND O.LegacyDepartmentId = @department" + index + ")");
            var utcStart = localDate.AddHours(-3);
            var utcEnd = utcStart.AddDays(1);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT O.LegacyCustomerId, O.LegacyDepartmentId,
       O.OrderId, O.LegacyMbId, O.DeliveryDate, O.Status, O.Revision,
       O.Note, O.UpdatedAtUtc, L.UStokId, L.AStokId, L.Quantity,
       L.ProductCode, L.ProductName, L.VariantName
FROM dbo.Orders O
LEFT JOIN dbo.OrderLines L ON L.OrderId = O.OrderId
WHERE (" + String.Join(" OR ", routeFilters.ToArray()) + @")
  AND O.DeliveryDate = @deliveryDate
  AND ((@scope = N'delivery')
       OR (@scope = N'submitted' AND O.CreatedAtUtc >= @utcStart
                                  AND O.CreatedAtUtc < @utcEnd))
ORDER BY O.LegacyCustomerId, O.LegacyDepartmentId,
         O.UpdatedAtUtc DESC, O.OrderId, L.ProductName, L.VariantName", connection))
            {
                for (var index = 0; index < stops.Count; index++)
                {
                    command.Parameters.Add("@customer" + index, SqlDbType.Int).Value =
                        stops[index].LegacyCustomerId;
                    command.Parameters.Add("@department" + index, SqlDbType.Int).Value =
                        stops[index].LegacyDepartmentId;
                }
                command.Parameters.Add("@scope", SqlDbType.NVarChar, 10).Value = scope;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate;
                command.Parameters.Add("@utcStart", SqlDbType.DateTime).Value = utcStart;
                command.Parameters.Add("@utcEnd", SqlDbType.DateTime).Value = utcEnd;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var branchKey = BranchKey(reader.GetInt32(0), reader.GetInt32(1));
                        OrderView order;
                        if (!orders.TryGetValue(branchKey, out order))
                        {
                            order = new OrderView {
                                OrderId = reader.GetInt32(2),
                                LegacyMbId = reader.GetInt32(3),
                                DeliveryDate = reader.GetDateTime(4),
                                Status = reader.GetString(5),
                                Revision = reader.GetInt32(6),
                                Note = reader.IsDBNull(7) ? null : reader.GetString(7),
                                UpdatedAtUtc = reader.GetDateTime(8),
                                Lines = new List<OrderLineView>()
                            };
                            orders.Add(branchKey, order);
                        }
                        if (!reader.IsDBNull(9) && order.OrderId == reader.GetInt32(2))
                            order.Lines.Add(new OrderLineView {
                                UStokId = reader.GetInt32(9),
                                AStokId = reader.GetInt32(10),
                                Quantity = reader.GetInt32(11),
                                ProductCode = reader.GetString(12),
                                ProductName = reader.GetString(13),
                                VariantName = reader.IsDBNull(14) ? null : reader.GetString(14)
                            });
                    }
            }
            return orders;
        }

        private static string BranchKey(int customerId, int departmentId)
        {
            return customerId.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" +
                departmentId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }
    }
}
