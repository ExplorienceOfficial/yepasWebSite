using System.Globalization;
using System.Text.RegularExpressions;

namespace Yepas.Api.Models
{
    public sealed class CatalogProduct
    {
        private static readonly Regex PackagePattern = new Regex(
            @"(?<![\p{L}\p{N}.,])(?<size>[0-9]+)\s*['’]?\s*[lL][iİıIuUüÜ](?![\p{L}\p{N}])",
            RegexOptions.CultureInvariant);

        public int UStokId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public int GroupId { get; set; }
        public int AStokId { get; set; }
        public string VariantName { get; set; }
        public int MaxQuantity { get; set; }
        public int PackageSize
        {
            get { return ResolvePackageSize() ?? 1; }
        }

        // Pozitif packageSize sözleşmesi korunur; belirsiz ürüne sipariş verilmez.
        public bool PackageSizeIsAmbiguous
        {
            get { return !ResolvePackageSize().HasValue; }
        }

        private int? ResolvePackageSize()
        {
            int? size = null;
            // Ayrı isimleri birleştirmek, isim sonundaki gramajı varyant ekiyle eşleştirebilir.
            foreach (var label in new[] { Name, VariantName })
            {
                foreach (Match match in PackagePattern.Matches(label ?? ""))
                {
                    int candidate;
                    if (!int.TryParse(match.Groups["size"].Value, NumberStyles.None,
                        CultureInfo.InvariantCulture, out candidate) || candidate <= 0)
                        return null;
                    if (size.HasValue && size.Value != candidate) return null;
                    size = candidate;
                }
            }
            return size ?? 1;
        }
    }
}
