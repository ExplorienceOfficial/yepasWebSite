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

        /// <summary>
        /// "Aktar" düğmesi: gün içinde verilen siparişleri sipariş alımı açıkken de
        /// eski sisteme yazar. Sonradan gelen değişiklikler yeniden PENDING olur ve
        /// bir sonraki aktarımda aynı mobil fişi güncelleyerek kapanır.
        /// </summary>
        public OrderFinalizationView Finalize(int userId)
        {
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            return Export(userId, OrderExportPolicy.ManualDeliveryDate(databaseUtcNow));
        }

        public OrderFinalizationView FinalizeDaily()
        {
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            return Export(null, OrderExportPolicy.DailyDeliveryDate(databaseUtcNow));
        }

        private OrderFinalizationView Export(int? userId, DateTime deliveryDate)
        {
            bool shouldExport;
            var finalization = finalizations.Begin(userId, deliveryDate, out shouldExport);
            if (!shouldExport) return finalization;
            try
            {
                var failed = 0;
                string firstError = null;
                foreach (var order in finalizations.ReadPending(deliveryDate))
                {
                    try
                    {
                        var receiptId = exporter.Export(order);
                        finalizations.MarkExported(order, receiptId);
                    }
                    catch (Exception exception)
                    {
                        // Tek bir bozuk sipariş veya eski sistem satırı günün geri
                        // kalanını engellememelidir; kalan siparişler aktarılır ve
                        // başarısız olanlar sonraki denemede yeniden ele alınır.
                        failed++;
                        if (firstError == null) firstError = exception.Message;
                        finalizations.MarkFailed(order, exception.Message);
                    }
                }
                if (failed > 0)
                {
                    finalizations.Fail(finalization.FinalizationId,
                        failed + " sipariş aktarılamadı: " + firstError);
                    return finalizations.Read(deliveryDate);
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
}
