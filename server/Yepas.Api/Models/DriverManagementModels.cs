namespace Yepas.Api.Models
{
    public sealed class DriverAccountSummary
    {
        public int UserId { get; set; }
        public string LoginName { get; set; }
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
    }

    public sealed class AdminDriverView
    {
        public int LegacyPersonnelId { get; set; }
        public string PersonnelCode { get; set; }
        public string PersonnelName { get; set; }
        public bool IsLegacyActive { get; set; }
        public int BranchCount { get; set; }
        public DriverAccountSummary Account { get; set; }
    }

    public sealed class CreateDriverAccountRequest
    {
        public string LoginName { get; set; }
        public string TemporaryPassword { get; set; }
    }

    public sealed class SetDriverAccountStatusRequest
    {
        public bool Enabled { get; set; }
    }

    public sealed class ResetDriverPasswordRequest
    {
        public string TemporaryPassword { get; set; }
    }
}
