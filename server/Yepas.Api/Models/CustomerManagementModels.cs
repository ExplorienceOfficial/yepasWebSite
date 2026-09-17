using System.Collections.Generic;

namespace Yepas.Api.Models
{
    public sealed class CustomerAccountSummary
    {
        public int UserId { get; set; }
        public string LoginName { get; set; }
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
    }

    public sealed class AdminCustomerView
    {
        public int LegacyMbId { get; set; }
        public int LegacyCustomerId { get; set; }
        public int LegacyDepartmentId { get; set; }
        public int LegacyPersonnelId { get; set; }
        public string CustomerCode { get; set; }
        public string CustomerName { get; set; }
        public string DepartmentName { get; set; }
        public string PersonnelName { get; set; }
        public string DistributionDays { get; set; }
        public int ProductCount { get; set; }
        public bool ProductAssignmentMissing { get { return ProductCount == 0; } }
        public CustomerAccountSummary Account { get; set; }
    }

    public sealed class CreateCustomerAccountRequest
    {
        public string LoginName { get; set; }
        public string TemporaryPassword { get; set; }
        public IList<int> LegacyMbIds { get; set; }
    }

    public sealed class SetCustomerAccountStatusRequest
    {
        public bool Enabled { get; set; }
    }

    public sealed class ResetCustomerPasswordRequest
    {
        public string TemporaryPassword { get; set; }
    }

    public sealed class ReplaceCustomerBranchesRequest
    {
        public IList<int> LegacyMbIds { get; set; }
    }

    public sealed class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
