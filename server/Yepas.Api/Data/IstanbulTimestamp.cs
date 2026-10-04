using System;

namespace Yepas.Api.Data
{
    // SQL Server 2005 DATETIME has no offset. Order/audit columns without a zone
    // suffix hold the SQL host's Turkey-local wall time; security dates stay UTC.
    public static class IstanbulTimestamp
    {
        private static readonly TimeZoneInfo Zone =
            TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");

        public static DateTime FromUtc(DateTime utc)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);
        }

        public static DateTime ToUtc(DateTime istanbul)
        {
            return TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(istanbul, DateTimeKind.Unspecified), Zone);
        }
    }
}
