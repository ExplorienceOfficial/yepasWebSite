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
            if (current == null && OrderWindowPolicy.IsGloballyOpen(settings, databaseUtcNow))
                throw new OrderStillOpenException();
            return Export(userId, deliveryDate);
        }

        public OrderFinalizationView FinalizeDaily()
        {
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            var localNow = databaseUtcNow.AddHours(3);
            if (localNow.TimeOfDay < TimeSpan.FromMinutes(1))
                throw new InvalidOperationException("Günlük aktarım 00:01 öncesinde çalıştırılamaz.");
            return Export(null, localNow.Date);
        }

        private OrderFinalizationView Export(int? userId, DateTime deliveryDate)
        {
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

    }

    public sealed class OrderStillOpenException : Exception
    {
        public OrderStillOpenException() : base("İlk aktarım için sipariş alımı kapatılmalıdır.") { }
    }
}
