using System;
using System.Collections.Generic;

namespace Yepas.Api.Models
{
    public sealed class DriverRouteStopView
    {
        public int LegacyMbId { get; set; }
        public int LegacyCustomerId { get; set; }
        public int LegacyDepartmentId { get; set; }
        public string CustomerCode { get; set; }
        public string CustomerName { get; set; }
        public string DepartmentName { get; set; }
        public OrderView Order { get; set; }
    }

    public sealed class DriverRouteView
    {
        public int LegacyPersonnelId { get; set; }
        public string PersonnelCode { get; set; }
        public string PersonnelName { get; set; }
        public string Scope { get; set; }
        public DateTime LocalDate { get; set; }
        public DateTime DeliveryDate { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
        public IList<DriverRouteStopView> Stops { get; set; }
    }
}
