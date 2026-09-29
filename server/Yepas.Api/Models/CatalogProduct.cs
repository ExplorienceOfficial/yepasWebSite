using System.Text.RegularExpressions;

namespace Yepas.Api.Models
{
    public sealed class CatalogProduct
    {
        public int UStokId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public int GroupId { get; set; }
        public int AStokId { get; set; }
        public string VariantName { get; set; }
        public int MaxQuantity { get; set; }
        public int PackageSize
        {
            get
            {
                var label = (Name ?? "") + " " + (VariantName ?? "");
                return Regex.IsMatch(label, @"(?<!\d)5\s*['’]?\s*[lL][iİıI](?![\p{L}\d])")
                    ? 5 : 1;
            }
        }
    }
}
