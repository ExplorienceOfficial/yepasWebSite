using System;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Domain
{
    public sealed class OrderFinalizationService
    {
        private readonly OrderRepository orders = new OrderRepository();
        private readonly AtomicOrderDaySynchronizer synchronizer = new AtomicOrderDaySynchronizer();

        /// <summary>
        /// "Aktar" düğmesi: yarın teslim edilecek günün aktif siparişleriyle
        /// yalnız uygulamaya ait eski fişleri tek transaction'da eşitler.
        /// </summary>
        public OrderFinalizationView Finalize(int userId)
        {
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            return synchronizer.Synchronize(userId, OrderExportPolicy.ManualDeliveryDate(databaseUtcNow), false);
        }

        public OrderFinalizationView FinalizeDaily()
        {
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            return synchronizer.Synchronize(null, OrderExportPolicy.DailyDeliveryDate(databaseUtcNow), true);
        }
    }
}
