using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class LegacyCustomerProductReader
    {
        private const string Sql = @"
SELECT T.U_STOK_ID, S.STOK_KODU, U.U_STOK_ADI, U.STOK_GRUP_ID,
       T.A_STOK_ID, A.A_STOK_ADI, MAX(T.U_STOK_LIMIT) AS U_STOK_LIMIT
FROM D00013.RS_MOBIL_SIPARIS_URUN_TANIMLARI T
INNER JOIN D00013.RS_URUNLER_UST U ON U.U_STOK_ID = T.U_STOK_ID
INNER JOIN D00013.STOK S ON S.STOK_ID = T.U_STOK_ID
LEFT JOIN D00013.RS_URUNLER_ALT A
    ON T.A_STOK_ID <> 0
   AND A.ID = T.A_STOK_ID
   AND A.U_STOK_ID = T.U_STOK_ID
WHERE T.MB_ID = @mbId
  AND (T.A_STOK_ID = 0 OR A.ID IS NOT NULL)
GROUP BY T.U_STOK_ID, S.STOK_KODU, U.U_STOK_ADI, U.STOK_GRUP_ID,
         T.A_STOK_ID, A.A_STOK_ADI
ORDER BY U.U_STOK_ADI, A.A_STOK_ADI, T.U_STOK_ID, T.A_STOK_ID";

        public IList<CatalogProduct> Read(int legacyMbId)
        {
            var products = new List<CatalogProduct>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(Sql, connection))
            {
                command.CommandTimeout = 30;
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        products.Add(new CatalogProduct
                        {
                            UStokId = reader.GetInt32(0),
                            Code = reader.GetString(1).Trim(),
                            Name = reader.GetString(2).Trim(),
                            GroupId = System.Convert.ToInt32(reader.GetValue(3)),
                            AStokId = reader.GetInt32(4),
                            VariantName = reader.IsDBNull(5) ? null : reader.GetString(5).Trim(),
                            MaxQuantity = reader.GetInt32(6)
                        });
            }
            return products;
        }
    }
}
