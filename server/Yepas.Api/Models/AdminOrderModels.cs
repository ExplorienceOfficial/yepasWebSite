using System;
using System.Collections.Generic;

namespace Yepas.Api.Models
{
    public sealed class AdminOrderRowView
    {
        public int LegacyMbId { get; set; }
        public int LegacyCustomerId { get; set; }
        public int LegacyDepartmentId { get; set; }
        public int LegacyPersonnelId { get; set; }
        public string CustomerCode { get; set; }
        public string CustomerName { get; set; }
        public string DepartmentName { get; set; }
        public string PersonnelName { get; set; }
        public string BoardStatus { get; set; }
        public string IntegrationStatus { get; set; }
        public string SourceRole { get; set; }
        public DateTime? LastExportedAtUtc { get; set; }
        public OrderView Order { get; set; }
    }

    public sealed class AdminOrderBoardView
    {
        public string Scope { get; set; }
        public DateTime LocalDate { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
        public IList<AdminOrderRowView> Rows { get; set; }
        public OrderFinalizationView Finalization { get; set; }

        /// <summary>
        /// Erişilemeyen kaynaklar. Bir tablo bozulduğunda ekran çökmez; eksik
        /// bölüm bu uyarılarla bildirilir ve kalan veriler gösterilir.
        /// </summary>
        public IList<string> Warnings { get; set; }
    }

    public sealed class OrderFinalizationView
    {
        public int FinalizationId { get; set; }
        public DateTime DeliveryDate { get; set; }
        public string State { get; set; }
        public int OrderCount { get; set; }
        public int LineCount { get; set; }
        public int TotalQuantity { get; set; }
        public int AttemptCount { get; set; }
        public DateTime StartedAtUtc { get; set; }
        public DateTime? FinalizedAtUtc { get; set; }
        public string LastError { get; set; }
    }

    public sealed class OrderSyncStatusView
    {
        public int PendingCount { get; set; }
        public DateTime? LastExportedAtUtc { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
    }
}
