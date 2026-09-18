using System;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Domain
{
    public sealed class OrderFinalizationService
    {
        private readonly OrderRepository orders = new OrderRepository();
        private readonly OrderFinalizationRepository finalizations = new OrderFinalizationRepository();
        private readonly LegacyOrderExporter exporter = new LegacyOrderExporter();

        public OrderFinalizationView Finalize(int userId)
        {
            DateTime databaseUtcNow;
            var settings = orders.ReadSettings(out databaseUtcNow);
            var deliveryDate = databaseUtcNow.AddHours(3).Date.AddDays(1);
            var current = finalizations.Read(deliveryDate);
            if (current == null && IsOrderingOpen(settings, databaseUtcNow))
                throw new OrderStillOpenException();

            bool shouldExport;
            var finalization = finalizations.Begin(userId, deliveryDate, out shouldExport);
            if (!shouldExport) return finalization;
            try
            {
                foreach (var order in finalizations.ReadPending(deliveryDate))
                {
                    var receiptId = exporter.Export(order);
                    finalizations.MarkExported(order, receiptId);
                }
                return finalizations.Complete(finalization.FinalizationId, deliveryDate);
            }
            catch (Exception exception)
            {
                finalizations.Fail(finalization.FinalizationId, exception.Message);
                throw;
            }
        }

        private static bool IsOrderingOpen(OrderWindowSettings settings, DateTime utcNow)
        {
            var mode = String.IsNullOrWhiteSpace(settings.OverrideMode)
                ? "AUTO" : settings.OverrideMode.Trim().ToUpperInvariant();
            if ((mode == "OPEN" || mode == "CLOSED") && settings.OverrideUntilUtc.HasValue &&
                settings.OverrideUntilUtc.Value <= utcNow) mode = "AUTO";
            if (mode == "OPEN") return true;
            if (mode == "CLOSED") return false;
            var localNow = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc).AddHours(3);
            return localNow.Hour * 60 + localNow.Minute <= settings.CutoffMinute;
        }
    }

    public sealed class OrderStillOpenException : Exception
    {
        public OrderStillOpenException() : base("Sipariş alımı kapatılmadan nihai hale getirilemez.") { }
    }

    public sealed class OrderFinalizedException : Exception
    {
        public OrderFinalizedException() : base("Bu teslim gününün siparişleri nihai hale getirildi.") { }
    }
}
