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
        public OrderView Order { get; set; }
    }

    public sealed class AdminOrderBoardView
    {
        public string Scope { get; set; }
        public DateTime LocalDate { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
        public IList<AdminOrderRowView> Rows { get; set; }
    }
}
