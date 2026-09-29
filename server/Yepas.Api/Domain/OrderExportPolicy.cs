using System;

namespace Yepas.Api.Domain
{
    public static class OrderExportPolicy
    {
        public static DateTime ManualDeliveryDate(DateTime databaseUtcNow)
        {
            return databaseUtcNow.AddHours(3).Date.AddDays(1);
        }

        public static DateTime DailyDeliveryDate(DateTime databaseUtcNow)
        {
            var localNow = databaseUtcNow.AddHours(3);
            if (localNow.TimeOfDay < TimeSpan.FromMinutes(1))
                throw new InvalidOperationException("Günlük aktarım 00:01 öncesinde çalıştırılamaz.");
            return localNow.Date;
        }
    }
}
