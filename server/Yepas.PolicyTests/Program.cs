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

            // Aynı gün TRT 19:00 olduğunda en yakın Cuma kapanır; sonraki haftaya atlanmaz.
            var thursdayAfterCutoffUtc = new DateTime(2026, 9, 17, 16, 0, 0, DateTimeKind.Utc);
            AssertDecision("kesim sonrası kapalı", fridayOnly, Auto(18 * 60),
                thursdayAfterCutoffUtc, false, new DateTime(2026, 9, 18));

            // Sipariş yalnız dağıtımdan önceki gün alınır; günler öncesinden açılamaz.
            var mondayMorningUtc = new DateTime(2026, 9, 14, 6, 0, 0, DateTimeKind.Utc);
            AssertDecision("sipariş günü dışında kapalı", fridayOnly, Auto(18 * 60),
                mondayMorningUtc, false, new DateTime(2026, 9, 18));

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

            var daily = Schedule(DayOfWeek.Saturday);
            var fridayMorningUtc = new DateTime(2026, 9, 18, 6, 0, 0, DateTimeKind.Utc);
            AssertDecision("sonraki sipariş günü yeniden açılır", daily, Auto(18 * 60),
                fridayMorningUtc, true, new DateTime(2026, 9, 19));

            AssertGlobal("AUTO kesim öncesi açık", Auto(18 * 60),
                new DateTime(2026, 9, 17, 14, 59, 0, DateTimeKind.Utc), true);
            AssertGlobal("AUTO kesim sonrası kapalı", Auto(18 * 60),
                new DateTime(2026, 9, 17, 15, 0, 1, DateTimeKind.Utc), false);
            AssertGlobal("manuel kapalı saatten bağımsız", closed,
                thursdayBeforeCutoffUtc, false);
            AssertGlobal("manuel açık saatten bağımsız", open,
                thursdayAfterCutoffUtc, true);

            if (failures != 0) Environment.Exit(1);
            Console.WriteLine("11 sipariş penceresi testi başarılı.");
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

        private static void AssertGlobal(string name, OrderWindowSettings settings,
            DateTime now, bool open)
        {
            var result = OrderWindowPolicy.IsGloballyOpen(settings, now);
            if (result == open) return;
            failures++;
            Console.Error.WriteLine("BAŞARISIZ: {0}; açık={1}", name, result);
        }
    }
}
