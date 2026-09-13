using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class ProductCatalogReader
    {
        private const string CatalogSql = @"
SELECT U.U_STOK_ID, S.STOK_KODU, U.U_STOK_ADI, U.STOK_GRUP_ID,
       ISNULL(A.ID, 0) AS A_STOK_ID, A.A_STOK_ADI
FROM D00013.RS_URUNLER_UST AS U
INNER JOIN D00013.STOK AS S ON S.STOK_ID = U.U_STOK_ID
LEFT JOIN D00013.RS_URUNLER_ALT AS A ON A.U_STOK_ID = U.U_STOK_ID
ORDER BY U.U_STOK_ADI, A.A_STOK_ADI, U.U_STOK_ID, A.ID";

        public IList<CatalogProduct> Read()
        {
            // Development-only local connection. No passwords are checked into source control.
            var connectionString = Environment.GetEnvironmentVariable("YEPAS_CATALOG_CONNECTION");
            if (String.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = @"Data Source=.\YEPASDEV;Initial Catalog=PrestoPlus_Local;Integrated Security=SSPI;Connect Timeout=15;Encrypt=False";
            }

            var products = new List<CatalogProduct>();
            using (var connection = new SqlConnection(connectionString))
            using (var command = new SqlCommand(CatalogSql, connection))
            {
                command.CommandTimeout = 30;
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        products.Add(new CatalogProduct
                        {
                            UStokId = reader.GetInt16(0),
                            Code = reader.GetString(1),
                            Name = reader.GetString(2),
                            GroupId = reader.GetInt16(3),
                            AStokId = reader.GetInt32(4),
                            VariantName = reader.IsDBNull(5) ? null : reader.GetString(5)
                        });
                    }
                }
            }
            return products;
        }
    }
}
