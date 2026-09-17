using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Domain;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class LegacyCustomerProductReader
    {
        private const string Sql = @"
SELECT DISTINCT U.U_STOK_ID, S.STOK_KODU, U.U_STOK_ADI, U.STOK_GRUP_ID,
       ISNULL(A.ID, 0) AS A_STOK_ID, A.A_STOK_ADI
FROM D00013.BF_MUST_STOK MS
INNER JOIN D00013.RS_URUNLER_UST U ON U.U_STOK_ID = MS.STOK_ID
INNER JOIN D00013.STOK S ON S.STOK_ID = U.U_STOK_ID
LEFT JOIN D00013.RS_URUNLER_ALT A ON A.U_STOK_ID = U.U_STOK_ID
WHERE MS.MUSTERI_ID = @customerId
  AND MS.BOLUM_ID = @departmentId
  AND MS.PERSONEL_ID = @personnelId
ORDER BY 3, 6, 1, 5";

        public IList<CatalogProduct> Read(LegacyCustomerSchedule schedule)
        {
            var products = new List<CatalogProduct>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(Sql, connection))
            {
                command.Parameters.Add("@customerId", SqlDbType.Int).Value = schedule.LegacyCustomerId;
                command.Parameters.Add("@departmentId", SqlDbType.Int).Value = schedule.LegacyDepartmentId;
                command.Parameters.Add("@personnelId", SqlDbType.Int).Value = schedule.LegacyPersonnelId;
                command.CommandTimeout = 30;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        products.Add(new CatalogProduct
                        {
                            UStokId = Convert.ToInt32(reader.GetValue(0)),
                            Code = reader.GetString(1),
                            Name = reader.GetString(2),
                            GroupId = Convert.ToInt32(reader.GetValue(3)),
                            AStokId = reader.GetInt32(4),
                            VariantName = reader.IsDBNull(5) ? null : reader.GetString(5)
                        });
            }
            return products;
        }
    }
}
