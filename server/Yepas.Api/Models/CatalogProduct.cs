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
    }
}
