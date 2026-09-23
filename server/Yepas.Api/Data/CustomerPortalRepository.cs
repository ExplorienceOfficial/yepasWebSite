using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class CustomerPortalRepository
    {
        public IList<CustomerBranchView> ReadBranches(int userId)
        {
            var mbIds = ReadAccessIds(userId);
            if (mbIds.Count == 0) return new List<CustomerBranchView>();

            var parameterNames = mbIds.Select((value, index) => "@mb" + index).ToArray();
            var sql = @"
SELECT MB.ID, MB.MUSTERI_ID, MB.BOLUM_ID, MB.PERSONEL_ID,
       M.MUST_KODU, M.MUST_ADI, B.BOLUM_ADI, M.VERGI_NO,
       LTRIM(RTRIM(ISNULL(P.PERSONEL_ADI, '') + ' ' + ISNULL(P.PERSONEL_SOYADI, ''))),
       MB.SG_1, MB.SG_2, MB.SG_3, MB.SG_4, MB.SG_5, MB.SG_6, MB.SG_7
FROM D00013.RS_MUSTERI_BILGILERI MB
INNER JOIN D00013.MUSTERILER M ON M.MUSTERI_ID = MB.MUSTERI_ID
INNER JOIN D00013.BF_MUST_BOLUM B
    ON B.MUSTERI_ID = MB.MUSTERI_ID AND B.BOLUM_ID = MB.BOLUM_ID
LEFT JOIN D00013.FIRMA_PERSONELI P ON P.PERSONEL_ID = MB.PERSONEL_ID
WHERE MB.SS = 12
  AND MB.ID IN (" + String.Join(",", parameterNames) + @")
ORDER BY M.MUST_ADI, B.BOLUM_ADI, MB.ID";

            var branches = new List<CustomerBranchView>();
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(sql, connection))
            {
                for (var index = 0; index < mbIds.Count; index++)
                    command.Parameters.Add(parameterNames[index], SqlDbType.Int).Value = mbIds[index];
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                    {
                        var days = new List<string>();
                        var names = new[] { "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz" };
                        for (var index = 0; index < 7; index++)
                            if (String.Equals(Convert.ToString(reader.GetValue(9 + index)).Trim(), "+",
                                StringComparison.Ordinal)) days.Add(names[index]);
                        branches.Add(new CustomerBranchView {
                            LegacyMbId = reader.GetInt32(0),
                            LegacyCustomerId = reader.GetInt32(1),
                            LegacyDepartmentId = reader.GetInt32(2),
                            LegacyPersonnelId = reader.GetInt32(3),
                            CustomerCode = Convert.ToString(reader.GetValue(4)).Trim(),
                            CustomerName = Convert.ToString(reader.GetValue(5)).Trim(),
                            DepartmentName = Convert.ToString(reader.GetValue(6)).Trim(),
                            TaxNumber = Convert.ToString(reader.GetValue(7)).Trim(),
                            PersonnelName = Convert.ToString(reader.GetValue(8)).Trim(),
                            DistributionDays = String.Join(", ", days)
                        });
                    }
            }
            return branches;
        }

        private static IList<int> ReadAccessIds(int userId)
        {
            var ids = new List<int>();
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT LegacyMbId FROM dbo.CustomerAccess
WHERE UserId = @userId ORDER BY LegacyMbId", connection))
            {
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read()) ids.Add(reader.GetInt32(0));
            }
            return ids;
        }
    }
}
