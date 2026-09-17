using System;
using Yepas.Api.Domain;

namespace Yepas.PolicyTests
{
    internal static class Program
    {
        private static int failures;

        private static void Main()
        {
            // 17 Eylül 2026 Perşembe 14:00 TRT; teslim Cuma, kesim Perşembe 18:00.
            var thursdayBeforeCutoffUtc = new DateTime(2026, 9, 17, 11, 0, 0, DateTimeKind.Utc);
            var fridayOnly = Schedule(DayOfWeek.Friday);
            AssertDecision("kesim öncesi en yakın SG", fridayOnly, Auto(18 * 60),
                thursdayBeforeCutoffUtc, true, new DateTime(2026, 9, 18));

            // Aynı gün TRT 19:00 olduğunda en yakın Cuma kapanır ve sonraki Cuma seçilir.
            var thursdayAfterCutoffUtc = new DateTime(2026, 9, 17, 16, 0, 0, DateTimeKind.Utc);
            AssertDecision("kesim sonrası sonraki SG", fridayOnly, Auto(18 * 60),
                thursdayAfterCutoffUtc, true, new DateTime(2026, 9, 25));

            var closed = Auto(18 * 60);
            closed.OverrideMode = "CLOSED";
            AssertDecision("manuel kapalı", fridayOnly, closed,
                thursdayBeforeCutoffUtc, false, new DateTime(2026, 9, 18));

            var open = Auto(18 * 60);
            open.OverrideMode = "OPEN";
            AssertDecision("manuel açık kesimi aşar", fridayOnly, open,
                thursdayAfterCutoffUtc, true, new DateTime(2026, 9, 18));

            var expired = Auto(18 * 60);
            expired.OverrideMode = "CLOSED";
            expired.OverrideUntilUtc = thursdayBeforeCutoffUtc.AddMinutes(-1);
            AssertDecision("süresi biten manuel durum AUTO olur", fridayOnly, expired,
                thursdayBeforeCutoffUtc, true, new DateTime(2026, 9, 18));

            if (failures != 0) Environment.Exit(1);
            Console.WriteLine("5 sipariş penceresi testi başarılı.");
        }

        private static LegacyCustomerSchedule Schedule(DayOfWeek day)
        {
            var days = new bool[7];
            days[day == DayOfWeek.Sunday ? 6 : (int)day - 1] = true;
            return new LegacyCustomerSchedule { LegacyMbId = 1, DistributionDays = days };
        }

        private static OrderWindowSettings Auto(int cutoff)
        {
            return new OrderWindowSettings { CutoffMinute = cutoff, OverrideMode = "AUTO" };
        }

        private static void AssertDecision(string name, LegacyCustomerSchedule schedule,
            OrderWindowSettings settings, DateTime now, bool open, DateTime delivery)
        {
            var result = OrderWindowPolicy.Evaluate(schedule, settings, now);
            if (result.IsOpen == open && result.DeliveryDate == delivery) return;
            failures++;
            Console.Error.WriteLine("BAŞARISIZ: {0}; açık={1}, teslim={2:yyyy-MM-dd}",
                name, result.IsOpen, result.DeliveryDate);
        }
    }
}
