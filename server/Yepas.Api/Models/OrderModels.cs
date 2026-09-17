using System;
using System.Collections.Generic;

namespace Yepas.Api.Models
{
    public sealed class OrderLineInput
    {
        public int UStokId { get; set; }
        public int AStokId { get; set; }
        public int Quantity { get; set; }
    }

    public sealed class SaveCustomerOrderRequest
    {
        public int? Revision { get; set; }
        public string Status { get; set; }
        public string Note { get; set; }
        public IList<OrderLineInput> Lines { get; set; }
    }

    public sealed class OrderLineView
    {
        public int UStokId { get; set; }
        public int AStokId { get; set; }
        public int Quantity { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string VariantName { get; set; }
    }

    public sealed class OrderView
    {
        public int OrderId { get; set; }
        public int LegacyMbId { get; set; }
        public DateTime DeliveryDate { get; set; }
        public string Status { get; set; }
        public int Revision { get; set; }
        public string Note { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public IList<OrderLineView> Lines { get; set; }
    }

    public sealed class OrderWindowView
    {
        public bool IsOpen { get; set; }
        public string Mode { get; set; }
        public int CutoffMinute { get; set; }
        public DateTime? DeadlineUtc { get; set; }
        public DateTime? OverrideUntilUtc { get; set; }
    }

    public sealed class CustomerOrderContextView
    {
        public int LegacyMbId { get; set; }
        public DateTime DeliveryDate { get; set; }
        public OrderWindowView Window { get; set; }
        public IList<CatalogProduct> Products { get; set; }
        public OrderView Order { get; set; }
    }

    public sealed class OrderSettingsView
    {
        public int CutoffMinute { get; set; }
        public string CutoffTime { get; set; }
        public string OverrideMode { get; set; }
        public DateTime? OverrideUntilUtc { get; set; }
        public string OverrideReason { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public sealed class UpdateOrderSettingsRequest
    {
        public string CutoffTime { get; set; }
        public string OverrideMode { get; set; }
        public DateTime? OverrideUntilUtc { get; set; }
        public string Reason { get; set; }
    }
}
