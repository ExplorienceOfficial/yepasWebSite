using System;
using System.Collections.Generic;
using Yepas.Api.Domain;
using Yepas.Api.Models;

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

            AssertPackage("5 Lİ PAKET", 5);
            AssertPackage("5li EKMEK", 5);
            AssertPackage("15li EKMEK", 1);
            AssertPackage("TEK EKMEK", 1);

            TestOrderSubmission();
            TestExportDates();
            TestDriverLoginNames();

            if (failures != 0) Environment.Exit(1);
            Console.WriteLine("11 sipariş penceresi, 4 paket, 11 sipariş doğrulama, " +
                "4 aktarım tarihi ve 5 şoför kullanıcı adı testi başarılı.");
        }

        private static void TestOrderSubmission()
        {
            var products = new List<CatalogProduct> {
                new CatalogProduct { UStokId = 10, AStokId = 0, Code = "A", Name = "5 Lİ PAKET", MaxQuantity = 20 },
                new CatalogProduct { UStokId = 11, AStokId = 2, Code = "B", Name = "NORMAL", MaxQuantity = 3 }
            };
            var valid = new List<OrderLineInput> {
                new OrderLineInput { UStokId = 10, AStokId = 0, Quantity = 10 },
                new OrderLineInput { UStokId = 11, AStokId = 2, Quantity = 3 }
            };
            var prepared = OrderSubmissionPolicy.Prepare("SUBMITTED", valid, products);
            Check("geçerli iki satır ve ürün kimliği", prepared.Count == 2 &&
                prepared[0].Quantity == 10 && prepared[1].AStokId == 2);
            Check("ürün istemiyorum satırsız", OrderSubmissionPolicy.Prepare("NO_PRODUCT", null, products).Count == 0);
            Check("iptal satırsız", OrderSubmissionPolicy.Prepare("CANCELLED", null, products).Count == 0);
            ExpectArgument("boş gönderim", "SUBMITTED", new List<OrderLineInput>(), products);
            ExpectArgument("iptalde ürün", "CANCELLED", valid, products);
            ExpectArgument("tanımsız ürün", "SUBMITTED", Lines(99, 0, 1), products);
            ExpectArgument("yanlış varyant", "SUBMITTED", Lines(11, 0, 1), products);
            ExpectArgument("yinelenen satır", "SUBMITTED", new List<OrderLineInput> {
                new OrderLineInput { UStokId = 10, AStokId = 0, Quantity = 5 },
                new OrderLineInput { UStokId = 10, AStokId = 0, Quantity = 5 }
            }, products);
            ExpectArgument("müşteri limiti", "SUBMITTED", Lines(10, 0, 25), products);
            ExpectArgument("5'li paket katı", "SUBMITTED", Lines(10, 0, 3), products);
            ExpectArgument("sıfır adet", "SUBMITTED", Lines(10, 0, 0), products);
        }

        private static void TestExportDates()
        {
            // Pazartesi 20:00 TRT -> manuel Salı teslim; Salı 00:00/00:01 sınırı.
            Check("manuel aktarım yarın", OrderExportPolicy.ManualDeliveryDate(
                new DateTime(2026, 9, 28, 17, 0, 0, DateTimeKind.Utc)) == new DateTime(2026, 9, 29));
            Check("gece sonrası manuel aktarım ertesi gün", OrderExportPolicy.ManualDeliveryDate(
                new DateTime(2026, 9, 28, 21, 1, 0, DateTimeKind.Utc)) == new DateTime(2026, 9, 30));
            Check("00:01 otomatik aktarım bugün", OrderExportPolicy.DailyDeliveryDate(
                new DateTime(2026, 9, 28, 21, 1, 0, DateTimeKind.Utc)) == new DateTime(2026, 9, 29));
            try {
                OrderExportPolicy.DailyDeliveryDate(new DateTime(2026, 9, 28, 21, 0, 0, DateTimeKind.Utc));
                Check("00:01 öncesi reddedilir", false);
            } catch (InvalidOperationException) { Check("00:01 öncesi reddedilir", true); }
        }

        private static void TestDriverLoginNames()
        {
            // Personel kodu varsa kullanıcı adı odur; yok veya tek karakterse
            // şoför kimliğinden üretilir, böylece hesap açılabilir.
            Check("personel kodu kullanılır",
                DriverAccountPolicy.LoginNameFor(31, "SFR-01") == "SFR-01");
            Check("boşluklar kırpılır",
                DriverAccountPolicy.LoginNameFor(31, "  SFR-02  ") == "SFR-02");
            Check("boş kod şoför kimliğinden üretilir",
                DriverAccountPolicy.LoginNameFor(31, "   ") == "SFR-31");
            Check("null kod şoför kimliğinden üretilir",
                DriverAccountPolicy.LoginNameFor(42, null) == "SFR-42");
            Check("tek karakterli kod reddedilir",
                DriverAccountPolicy.LoginNameFor(7, "A") == "SFR-7");
        }

        private static IList<OrderLineInput> Lines(int product, int variant, int quantity)
        {
            return new List<OrderLineInput> {
                new OrderLineInput { UStokId = product, AStokId = variant, Quantity = quantity }
            };
        }

        private static void ExpectArgument(string name, string status, IList<OrderLineInput> lines,
            IList<CatalogProduct> products)
        {
            try { OrderSubmissionPolicy.Prepare(status, lines, products); Check(name, false); }
            catch (ArgumentException) { Check(name, true); }
        }

        private static void Check(string name, bool passed)
        {
            if (passed) return;
            failures++;
            Console.Error.WriteLine("BAŞARISIZ: {0}", name);
        }

        private static void AssertPackage(string name, int expected)
        {
            var actual = new CatalogProduct { Name = name }.PackageSize;
            if (actual == expected) return;
            failures++;
            Console.Error.WriteLine("BAŞARISIZ: paket {0}; beklenen={1}, gerçek={2}", name, expected, actual);
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
