using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class LegacyCustomerCatalogReader
    {
        private const string Sql = @"
SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID, MB.PERSONEL_ID,
       M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI,
       ISNULL(P.PERSONEL_ADI, '') + ' ' + ISNULL(P.PERSONEL_SOYADI, ''),
       ISNULL(PC.PRODUCT_COUNT, 0),
       MB.SG_1, MB.SG_2, MB.SG_3, MB.SG_4, MB.SG_5, MB.SG_6, MB.SG_7
FROM D00013.RS_MUSTERI_BILGILERI MB
INNER JOIN D00013.MUSTERILER M ON M.MUSTERI_ID = MB.MUSTERI_ID
INNER JOIN D00013.BF_MUST_BOLUM B
    ON B.BOLUM_ID = MB.BOLUM_ID AND B.MUSTERI_ID = MB.MUSTERI_ID
LEFT JOIN D00013.FIRMA_PERSONELI P ON P.PERSONEL_ID = MB.PERSONEL_ID
LEFT JOIN (
    SELECT MS.MUSTERI_ID, MS.BOLUM_ID, MS.PERSONEL_ID,
           COUNT(DISTINCT MS.STOK_ID) AS PRODUCT_COUNT
    FROM D00013.BF_MUST_STOK MS
    INNER JOIN D00013.RS_URUNLER_UST U ON U.U_STOK_ID = MS.STOK_ID
    GROUP BY MS.MUSTERI_ID, MS.BOLUM_ID, MS.PERSONEL_ID
) PC ON PC.MUSTERI_ID = MB.MUSTERI_ID
    AND PC.BOLUM_ID = MB.BOLUM_ID
    AND PC.PERSONEL_ID = MB.PERSONEL_ID
ORDER BY M.MUST_ADI, B.BOLUM_ADI, MB.ID";

        public IList<AdminCustomerView> Read()
        {
            var rows = new List<AdminCustomerView>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(Sql, connection))
            {
                command.CommandTimeout = 30;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var days = new List<string>();
                        var names = new[] { "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz" };
                        for (var index = 0; index < 7; index++)
                            if (String.Equals(Convert.ToString(reader.GetValue(9 + index)).Trim(), "+",
                                StringComparison.Ordinal)) days.Add(names[index]);
                        rows.Add(new AdminCustomerView
                        {
                            LegacyMbId = reader.GetInt32(0),
                            LegacyCustomerId = reader.GetInt32(1),
                            LegacyDepartmentId = reader.GetInt32(2),
                            LegacyPersonnelId = reader.GetInt32(3),
                            CustomerCode = Convert.ToString(reader.GetValue(4)).Trim(),
                            CustomerName = Convert.ToString(reader.GetValue(5)).Trim(),
                            DepartmentName = Convert.ToString(reader.GetValue(6)).Trim(),
                            PersonnelName = Convert.ToString(reader.GetValue(7)).Trim(),
                            ProductCount = reader.GetInt32(8),
                            DistributionDays = String.Join(", ", days)
                        });
                    }
            }
            return rows;
        }
    }
}
