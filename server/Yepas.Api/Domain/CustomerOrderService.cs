using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Domain
{
    public sealed class PreparedOrderLine
    {
        public int UStokId { get; set; }
        public int AStokId { get; set; }
        public int Quantity { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string VariantName { get; set; }
    }

    public sealed class CustomerOrderService
    {
        private readonly OrderRepository orders = new OrderRepository();
        private readonly LegacyCustomerScheduleReader schedules = new LegacyCustomerScheduleReader();

        public CustomerOrderContextView GetContext(int legacyMbId)
        {
            var schedule = schedules.Read(legacyMbId);
            if (schedule == null) return null;

            DateTime databaseUtcNow;
            var settings = orders.ReadSettings(out databaseUtcNow);
            var decision = OrderWindowPolicy.Evaluate(schedule, settings, databaseUtcNow);
            var products = AccessibleProducts(legacyMbId);

            return new CustomerOrderContextView
            {
                LegacyMbId = legacyMbId,
                DeliveryDate = decision.DeliveryDate,
                Window = new OrderWindowView
                {
                    IsOpen = decision.IsOpen,
                    Mode = decision.EffectiveMode,
                    CutoffMinute = settings.CutoffMinute,
                    DeadlineUtc = decision.DeadlineUtc,
                    OverrideUntilUtc = settings.OverrideUntilUtc
                },
                Products = products,
                Order = orders.ReadOrder(legacyMbId, decision.DeliveryDate)
            };
        }

        public OrderView Save(int userId, int legacyMbId, SaveCustomerOrderRequest input,
            string idempotencyKey)
        {
            if (input == null) throw new ArgumentException("Sipariş gövdesi zorunludur.");
            var status = String.IsNullOrWhiteSpace(input.Status)
                ? null : input.Status.Trim().ToUpperInvariant();
            if (status != "SUBMITTED" && status != "NO_PRODUCT" && status != "CANCELLED")
                throw new ArgumentException("Geçersiz sipariş durumu.");
            if (input.Note != null && input.Note.Length > 500)
                throw new ArgumentException("Sipariş notu en fazla 500 karakter olabilir.");
            if (String.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 100)
                throw new ArgumentException("Geçerli bir Idempotency-Key başlığı zorunludur.");

            var schedule = schedules.Read(legacyMbId);
            if (schedule == null) throw new KeyNotFoundException("Müşteri operasyon kaydı bulunamadı.");

            var products = AccessibleProducts(legacyMbId);
            var productMap = products.ToDictionary(ProductKey, StringComparer.Ordinal);
            var prepared = new List<PreparedOrderLine>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var sourceLines = input.Lines ?? new List<OrderLineInput>();

            if (status == "SUBMITTED" && sourceLines.Count == 0)
                throw new ArgumentException("Gönderilmiş siparişte en az bir ürün olmalıdır.");
            if (status != "SUBMITTED" && sourceLines.Count != 0)
                throw new ArgumentException("Ürün istemiyorum veya iptal durumunda ürün satırı gönderilemez.");

            foreach (var line in sourceLines)
            {
                if (line == null || line.UStokId <= 0 || line.AStokId < 0 ||
                    line.Quantity <= 0 || line.Quantity > 100000)
                    throw new ArgumentException("Geçersiz sipariş satırı.");
                var key = ProductKey(line.UStokId, line.AStokId);
                CatalogProduct product;
                if (!seen.Add(key) || !productMap.TryGetValue(key, out product))
                    throw new ArgumentException("Ürün müşteriye tanımlı değil veya tekrarlı gönderildi.");
                prepared.Add(new PreparedOrderLine
                {
                    UStokId = line.UStokId,
                    AStokId = line.AStokId,
                    Quantity = line.Quantity,
                    ProductCode = product.Code,
                    ProductName = product.Name,
                    VariantName = product.VariantName
                });
            }

            return orders.SaveCustomerOrder(userId, schedule, input, status, prepared,
                idempotencyKey.Trim(), RequestHash(legacyMbId, input, status));
        }

        private IList<CatalogProduct> AccessibleProducts(int legacyMbId)
        {
            var keys = orders.ReadAccessibleProductKeys(legacyMbId);
            return new ProductCatalogReader().Read()
                .Where(product => keys.Contains(ProductKey(product)))
                .ToList();
        }

        private static string ProductKey(CatalogProduct product)
        {
            return ProductKey(product.UStokId, product.AStokId);
        }

        private static string ProductKey(int uStokId, int aStokId)
        {
            return uStokId.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" +
                aStokId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        private static byte[] RequestHash(int legacyMbId, SaveCustomerOrderRequest input, string status)
        {
            var builder = new StringBuilder();
            builder.Append(legacyMbId).Append('|').Append(input.Revision.GetValueOrDefault(0))
                .Append('|').Append(status).Append('|').Append(input.Note ?? String.Empty);
            foreach (var line in (input.Lines ?? new List<OrderLineInput>())
                .OrderBy(item => item.UStokId).ThenBy(item => item.AStokId))
                builder.Append('|').Append(line.UStokId).Append(':').Append(line.AStokId)
                    .Append(':').Append(line.Quantity);
            using (var sha = SHA256.Create())
                return sha.ComputeHash(Encoding.UTF8.GetBytes(builder.ToString()));
        }
    }
}
