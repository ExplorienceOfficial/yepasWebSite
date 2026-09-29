using System;
using System.Collections.Generic;
using System.Linq;
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

    public static class OrderSubmissionPolicy
    {
        public static IList<PreparedOrderLine> Prepare(string status,
            IList<OrderLineInput> lines, IList<CatalogProduct> products)
        {
            var sourceLines = lines ?? new List<OrderLineInput>();
            if (status == "SUBMITTED" && sourceLines.Count == 0)
                throw new ArgumentException("Gönderilmiş siparişte en az bir ürün olmalıdır.");
            if (status != "SUBMITTED" && sourceLines.Count != 0)
                throw new ArgumentException("Ürün istemiyorum veya iptal durumunda ürün satırı gönderilemez.");

            var productMap = products.ToDictionary(ProductKey, StringComparer.Ordinal);
            var prepared = new List<PreparedOrderLine>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var line in sourceLines)
            {
                if (line == null || line.UStokId <= 0 || line.AStokId < 0 ||
                    line.Quantity <= 0 || line.Quantity > 100000)
                    throw new ArgumentException("Geçersiz sipariş satırı.");
                var key = ProductKey(line.UStokId, line.AStokId);
                CatalogProduct product;
                if (!seen.Add(key) || !productMap.TryGetValue(key, out product))
                    throw new ArgumentException("Ürün müşteriye tanımlı değil veya tekrarlı gönderildi.");
                if (product.MaxQuantity > 0 && line.Quantity > product.MaxQuantity)
                    throw new ArgumentException("Ürün miktarı müşteri limitini aşıyor.");
                if (line.Quantity % product.PackageSize != 0)
                    throw new ArgumentException("5'li paket ürünü yalnızca 5'in katlarıyla sipariş edilebilir.");
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
            return prepared;
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
    }
}
