using System;
using Yepas.Api.Data;

namespace Yepas.Api.Domain
{
    public static class OrderDaySyncPolicy
    {
        public static void EnsureWritable(DateTime deliveryDate, DateTime databaseUtcNow,
            DateTime? closedAt)
        {
            // Also rejects a request whose date was selected before midnight,
            // even when the automatic export has not run yet.
            if (closedAt.HasValue || deliveryDate.Date <= IstanbulTimestamp.FromUtc(databaseUtcNow).Date)
                throw new OrderDayClosedException();
        }

        public static bool BelongsInLegacy(string status)
        {
            return status == "SUBMITTED";
        }

        public static bool NeedsReceiptWrite(bool registered, int revision,
            int lastSyncedRevision, string integrationStatus, bool legacyLinesMatch)
        {
            return !registered || revision != lastSyncedRevision ||
                integrationStatus != "EXPORTED" || !legacyLinesMatch;
        }
    }

    public sealed class OrderDayClosedException : Exception
    {
        public OrderDayClosedException() : base("Bu teslim günü kapandı; sipariş değiştirilemez.") { }
    }
}
