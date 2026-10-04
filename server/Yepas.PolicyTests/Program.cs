using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Yepas.Api.Data;
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
            AssertPackage("15li EKMEK", 15);
            AssertPackage("3’lü EKMEK", 3);
            AssertPackage("6'lı EKMEK", 6);
            AssertPackage("10 lu PAKET", 10);
            AssertPackage("4 LÜ HAMBURGER EKMEK 220 GR", 4);
            AssertPackage("2 Lİ SANDVİÇ KANEPE (2*100)", 2);
            AssertPackage("8 Lİ KANEPE (25GR*8=200GR)", 8);
            AssertPackage("12 Lı PAKET", 12);
            AssertPackage("20 LU PAKET", 20);
            AssertPackage("100 GR LAVAŞ", 1);
            AssertPackage("150 GR SÜTLÜ", 1);
            AssertPackage("200 GR DEVELİ", 1);
            AssertPackage("1 KOLİ", 1);
            AssertPackage("2. SERVİS ÇİFT BIÇAKLI", 1);
            AssertPackage("100GR*4", 1);
            AssertPackage("2.5li EKMEK", 1);
            AssertPackage("2,5 Lİ EKMEK", 1);
            AssertPackage("ABC5li EKMEK", 1);
            AssertPackage("5lik EKMEK", 1);
            AssertPackage("125 GR EKMEK", 5, "ABA EKMEĞİ [5 Lİ PAKET]");
            AssertPackage("150 GR AMB. ÇİFT BIÇAKLI", 4, "4 LÜ PAKET");
            AssertPackage("8 Lİ KANEPE", 8, "8li PAKET");
            AssertPackage("8 Lİ KANEPE (25GR*8=200GR)", 1, "2 Lİ BURGER KANEPE", true);
            AssertPackage("2 Lİ VE 8 Lİ", 1, null, true);
            AssertPackage("0 Lİ PAKET", 1, null, true);
            AssertPackage("999999999999999 Lİ PAKET", 1, null, true);
            AssertPackage("ÜRÜN 5", 1, "Lİ");
            AssertPackage("TEK EKMEK", 1);
            AssertPackage(null, 1);

            TestCustomerNotes();
            TestStatusBoundaries();
            TestOrderSubmission();
            TestExportDates();
            TestDaySyncPolicy();
            TestDriverLoginNames();
            TestIstanbulTimestamp();

            if (failures != 0) Environment.Exit(1);
            Console.WriteLine("Sipariş penceresi, paket adedi/çelişki, sipariş doğrulama, " +
                "aktarım tarihi, gün eşitleme, şoför kullanıcı adı ve saat dilimi testleri başarılı.");
        }

        private static void TestStatusBoundaries()
        {
            var now = new DateTime(2026, 10, 4, 23, 3, 0, DateTimeKind.Utc);
            var cutoff = new DateTime(2026, 10, 4, 23, 4, 0, DateTimeKind.Utc);
            var settings = Auto(124);
            Check("SQL saatine göre değişken kapanış sınırı", OrderWindowPolicy.NextGlobalChangeUtc(settings, now) == cutoff.AddMilliseconds(1));
            Check("kesim anı dahil, sonrası kapalı", OrderWindowPolicy.IsGloballyOpen(settings, cutoff) && !OrderWindowPolicy.IsGloballyOpen(settings, cutoff.AddMilliseconds(1)));
            Check("kapanış sonrası sıradaki sınır İstanbul gece yarısı", OrderWindowPolicy.NextGlobalChangeUtc(settings, cutoff.AddMinutes(1)) == new DateTime(2026, 10, 5, 21, 0, 0, DateTimeKind.Utc));
            settings.CutoffMinute = 128;
            Check("saat değişince yeni sınır", OrderWindowPolicy.NextGlobalChangeUtc(settings, now) == cutoff.AddMinutes(4).AddMilliseconds(1));
            settings.OverrideMode = "OPEN";
            Check("süresiz manuel açık zamanlayıcı yok", !OrderWindowPolicy.NextGlobalChangeUtc(settings, now).HasValue);
            settings.OverrideMode = "CLOSED";
            Check("süresiz manuel kapalı zamanlayıcı yok", !OrderWindowPolicy.NextGlobalChangeUtc(settings, now).HasValue);
            settings.OverrideUntilUtc = now.AddMinutes(2);
            Check("manuel sürenin bitişi takip edilir", OrderWindowPolicy.NextGlobalChangeUtc(settings, now) == now.AddMinutes(2));
            Check("manuel süre bitince AUTO sınırı", OrderWindowPolicy.NextGlobalChangeUtc(settings, now.AddMinutes(3)) == cutoff.AddMinutes(4).AddMilliseconds(1));
            settings = Auto(0);
            Check("00:00 kesimi sıkı döngüye girmez", OrderWindowPolicy.NextGlobalChangeUtc(settings, now) == new DateTime(2026, 10, 5, 21, 0, 0, DateTimeKind.Utc));
        }

        private static void TestCustomerNotes()
        {
            foreach (var value in new[] { "0000", "0123", "9876" })
                Check("4 rakamlı şoför parolası", DriverAccountPolicy.IsValidPassword(value));
            foreach (var value in new[] { null, "", "123", "12345", "12a4", " 1234", "1234 ", "1234\n", "１２３４", "١٢٣٤" })
                Check("geçersiz şoför parolası", !DriverAccountPolicy.IsValidPassword(value));
            Check("geçerli kullanıcı adı", AccountNamePolicy.Validate("bayi-01") == "bayi-01");
            foreach (var value in new[] { "bayi 01", " bayi01", "bayi01 ", "bayi\t01", "bayi\u00a001", "bayi\n01", "", "ab", null })
            {
                try { AccountNamePolicy.Validate(value); Check("geçersiz kullanıcı adı reddi", false); }
                catch (ArgumentException) { Check("geçersiz kullanıcı adı reddi", true); }
            }
            Check("iç boşluklu personel kodu güvenli ad üretir",
                DriverAccountPolicy.LoginNameFor(31, "SFR 01") == "SFR-31");
            Check("manuel açık saat gösterimi", OrderWindowPolicy.DisplayCutoffTime("OPEN", 1080) == "00:00");
            Check("manuel kapalı saat gösterimi", OrderWindowPolicy.DisplayCutoffTime("CLOSED", 1080) == "00:00");
            Check("otomatik saat korunur", OrderWindowPolicy.DisplayCutoffTime("AUTO", 1085) == "18:05");
            var beforeMidnight = new DateTime(2026, 10, 5, 20, 59, 0, DateTimeKind.Utc);
            var afterMidnight = beforeMidnight.AddMinutes(2);
            Check("bugün verilen yarın dağıtılır", DriverRoutePolicy.DeliveryDate("submitted", beforeMidnight) == new DateTime(2026, 10, 6));
            Check("gece sınırı SQL saatiyle ertesi gün", DriverRoutePolicy.DeliveryDate("submitted", afterMidnight) == new DateTime(2026, 10, 7));
            Check("dün verilen bugün dağıtılır", DriverRoutePolicy.DeliveryDate("delivery", afterMidnight) == new DateTime(2026, 10, 6));
            var conflict = new AccountConflictException("BRANCH_ALREADY_LINKED", "Şube bağlı");
            Check("bayi ve kullanıcı adı hata kodları ayrılır", conflict.Code != "LOGIN_NAME_IN_USE");
        }

        private static void TestDaySyncPolicy()
        {
            var date = new DateTime(2026, 10, 6);
            var midnightUtc = new DateTime(2026, 10, 5, 21, 0, 0, DateTimeKind.Utc);
            OrderDaySyncPolicy.EnsureWritable(date, midnightUtc.AddSeconds(-1), null);
            Check("manuel aktarım açık günü kilitlemez", true);
            foreach (var role in new[] { "ADMIN", "CUSTOMER" })
            foreach (var status in new[] { "SUBMITTED", "CANCELLED", "NO_PRODUCT" })
            {
                foreach (var instant in new[] { midnightUtc, midnightUtc.AddMinutes(1) })
                {
                    try
                    {
                        OrderDaySyncPolicy.EnsureWritable(date, instant, null);
                        Check(role + " " + status + " gece sınırı reddi", false);
                    }
                    catch (OrderDayClosedException) { Check(role + " " + status + " gece sınırı reddi", true); }
                }
                try
                {
                    OrderDaySyncPolicy.EnsureWritable(date.AddDays(1), midnightUtc, date);
                    Check(role + " " + status + " kalıcı kapanış reddi", false);
                }
                catch (OrderDayClosedException) { Check(role + " " + status + " kalıcı kapanış reddi", true); }
            }
            OrderDaySyncPolicy.EnsureWritable(date.AddDays(1), midnightUtc.AddMinutes(1), null);
            Check("kapanış ertesi teslim gününü etkilemez", true);
            Check("ürünlü sipariş eski sistemde bulunur",
                OrderDaySyncPolicy.BelongsInLegacy("SUBMITTED"));
            Check("ürün istemiyorum eski sistemde bulunmaz",
                !OrderDaySyncPolicy.BelongsInLegacy("NO_PRODUCT"));
            Check("iptal eski sistemde bulunmaz",
                !OrderDaySyncPolicy.BelongsInLegacy("CANCELLED"));
            Check("aynı revizyon ve satırlar tekrar yazılmaz",
                !OrderDaySyncPolicy.NeedsReceiptWrite(true, 2, 2, "EXPORTED", true));
            Check("eski sistem satırı değişmişse yeniden yazılır",
                OrderDaySyncPolicy.NeedsReceiptWrite(true, 2, 2, "EXPORTED", false));
        }

        private static void TestIstanbulTimestamp()
        {
            var utc = new DateTime(2026, 9, 29, 21, 1, 0, DateTimeKind.Utc);
            var local = IstanbulTimestamp.FromUtc(utc);
            Check("UTC gece sınırı İstanbul ertesi gün", local == new DateTime(2026, 9, 30, 0, 1, 0) &&
                local.Kind == DateTimeKind.Unspecified);
            var roundTrip = IstanbulTimestamp.ToUtc(local);
            Check("İstanbul kaydı UTC'ye dönüşür", roundTrip == utc &&
                roundTrip.Kind == DateTimeKind.Utc);
            var json = JsonConvert.SerializeObject(new {
                updatedAtUtc = roundTrip,
                deliveryDate = new DateTime(2026, 9, 30)
            });
            Check("API UTC Z işareti taşır", json.Contains("\"updatedAtUtc\":\"2026-09-29T21:01:00Z\""));
            Check("teslim tarihi saat dilimi dönüşümüne girmez",
                json.Contains("\"deliveryDate\":\"2026-09-30T00:00:00\""));
        }

        private static void TestOrderSubmission()
        {
            var products = new List<CatalogProduct> {
                new CatalogProduct { UStokId = 10, AStokId = 0, Code = "A", Name = "5 Lİ PAKET", MaxQuantity = 20 },
                new CatalogProduct { UStokId = 11, AStokId = 2, Code = "B", Name = "NORMAL", MaxQuantity = 3 },
                new CatalogProduct { UStokId = 12, AStokId = 0, Code = "C", Name = "6'lı EKMEK", MaxQuantity = 30 },
                new CatalogProduct { UStokId = 1415, AStokId = 332, Name = "8 Lİ KANEPE", VariantName = "2 Lİ BURGER KANEPE" }
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
            Check("ürün kataloğu yalnız gönderimde gerekir",
                OrderSubmissionPolicy.RequiresProductCatalog("SUBMITTED") &&
                !OrderSubmissionPolicy.RequiresProductCatalog("NO_PRODUCT") &&
                !OrderSubmissionPolicy.RequiresProductCatalog("CANCELLED"));
            Check("ürün istemiyorum katalogsuz",
                OrderSubmissionPolicy.Prepare("NO_PRODUCT", null, new List<CatalogProduct>()).Count == 0);
            Check("iptal katalogsuz",
                OrderSubmissionPolicy.Prepare("CANCELLED", null, new List<CatalogProduct>()).Count == 0);
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
            Check("6'lı pakette geçerli kat", OrderSubmissionPolicy.Prepare(
                "SUBMITTED", Lines(12, 0, 12), products)[0].Quantity == 12);
            ExpectArgument("6'lı pakette yanlış kat", "SUBMITTED", Lines(12, 0, 10), products);
            ExpectArgument("çelişen paket ürünü reddedilir", "SUBMITTED", Lines(1415, 332, 8), products);
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

        private static void AssertPackage(string name, int expected, string variant = null,
            bool ambiguous = false)
        {
            var product = new CatalogProduct { Name = name, VariantName = variant };
            var actual = product.PackageSize;
            if (actual == expected && product.PackageSizeIsAmbiguous == ambiguous) return;
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
