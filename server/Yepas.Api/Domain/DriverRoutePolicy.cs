using System;
using Yepas.Api.Data;

namespace Yepas.Api.Domain
{
    public static class DriverRoutePolicy
    {
        public static DateTime DeliveryDate(string scope, DateTime databaseUtcNow)
        {
            var localDate = IstanbulTimestamp.FromUtc(databaseUtcNow).Date;
            if (scope == "delivery") return localDate;
            if (scope == "submitted") return localDate.AddDays(1);
            throw new ArgumentException("Kapsam delivery veya submitted olmalıdır.");
        }
    }
}
