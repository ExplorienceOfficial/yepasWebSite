using System;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Domain;

namespace Yepas.Api.Data
{
    public sealed class LegacyCustomerScheduleReader
    {
        private const string Sql = @"
SELECT ID, MUSTERI_ID, BOLUM_ID, PERSONEL_ID,
       SG_1, SG_2, SG_3, SG_4, SG_5, SG_6, SG_7
FROM D00013.RS_MUSTERI_BILGILERI
WHERE ID = @mbId";

        public LegacyCustomerSchedule Read(int legacyMbId)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            using (var command = new SqlCommand(Sql, connection))
            {
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    var days = new bool[7];
                    for (var index = 0; index < 7; index++)
                        days[index] = String.Equals(Convert.ToString(reader.GetValue(4 + index)).Trim(), "+",
                            StringComparison.Ordinal);
                    return new LegacyCustomerSchedule
                    {
                        LegacyMbId = reader.GetInt32(0),
                        LegacyCustomerId = reader.GetInt32(1),
                        LegacyDepartmentId = reader.GetInt32(2),
                        LegacyPersonnelId = reader.GetInt32(3),
                        DistributionDays = days
                    };
                }
            }
        }
    }
}
