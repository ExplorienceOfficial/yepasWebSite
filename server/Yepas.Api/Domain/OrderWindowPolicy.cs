using System;

namespace Yepas.Api.Domain
{
    public sealed class LegacyCustomerSchedule
    {
        public int LegacyMbId { get; set; }
        public int LegacyCustomerId { get; set; }
        public int LegacyDepartmentId { get; set; }
        public int LegacyPersonnelId { get; set; }
        public bool[] DistributionDays { get; set; }
    }

    public sealed class OrderWindowSettings
    {
        public int CutoffMinute { get; set; }
        public string OverrideMode { get; set; }
        public DateTime? OverrideUntilUtc { get; set; }
        public string OverrideReason { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public sealed class OrderWindowDecision
    {
        public bool IsOpen { get; set; }
        public string EffectiveMode { get; set; }
        public DateTime DeliveryDate { get; set; }
        public DateTime? DeadlineUtc { get; set; }
    }

    public static class OrderWindowPolicy
    {
        private const int TurkeyUtcOffsetHours = 3;

        public static OrderWindowDecision Evaluate(
            LegacyCustomerSchedule schedule, OrderWindowSettings settings, DateTime utcNow)
        {
            if (schedule == null || schedule.DistributionDays == null || schedule.DistributionDays.Length != 7)
                throw new InvalidOperationException("Müşteri dağıtım planı bulunamadı.");
            if (settings == null) throw new InvalidOperationException("Sipariş ayarı bulunamadı.");

            var effectiveMode = EffectiveMode(settings, utcNow);
            var localNow = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc).AddHours(TurkeyUtcOffsetHours);

            for (var offset = 1; offset <= 14; offset++)
            {
                var candidate = localNow.Date.AddDays(offset);
                if (!IsDistributionDay(schedule.DistributionDays, candidate.DayOfWeek)) continue;

                var localDeadline = candidate.AddDays(-1).AddMinutes(settings.CutoffMinute);
                var deadlineUtc = DateTime.SpecifyKind(localDeadline.AddHours(-TurkeyUtcOffsetHours), DateTimeKind.Utc);

                if (effectiveMode == "OPEN")
                    return Decision(true, effectiveMode, candidate, deadlineUtc);
                if (effectiveMode == "CLOSED")
                    return Decision(false, effectiveMode, candidate, deadlineUtc);
                var isOrderDay = localNow.Date == candidate.AddDays(-1).Date;
                return Decision(isOrderDay && utcNow <= deadlineUtc,
                    effectiveMode, candidate, deadlineUtc);
            }
            throw new InvalidOperationException("Müşterinin SG dağıtım günü bulunamadı.");
        }

        public static string EffectiveMode(OrderWindowSettings settings, DateTime utcNow)
        {
            if (settings == null) throw new InvalidOperationException("Sipariş ayarı bulunamadı.");
            var mode = String.IsNullOrWhiteSpace(settings.OverrideMode)
                ? "AUTO" : settings.OverrideMode.Trim().ToUpperInvariant();
            if ((mode == "OPEN" || mode == "CLOSED") && settings.OverrideUntilUtc.HasValue &&
                settings.OverrideUntilUtc.Value <= utcNow) return "AUTO";
            return mode == "OPEN" || mode == "CLOSED" ? mode : "AUTO";
        }

        public static bool IsGloballyOpen(OrderWindowSettings settings, DateTime utcNow)
        {
            var mode = EffectiveMode(settings, utcNow);
            if (mode == "OPEN") return true;
            if (mode == "CLOSED") return false;
            var localNow = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc)
                .AddHours(TurkeyUtcOffsetHours);
            return localNow.TimeOfDay <= TimeSpan.FromMinutes(settings.CutoffMinute);
        }

        private static bool IsDistributionDay(bool[] days, DayOfWeek day)
        {
            var index = day == DayOfWeek.Sunday ? 6 : ((int)day - 1);
            return days[index];
        }

        private static OrderWindowDecision Decision(
            bool isOpen, string mode, DateTime deliveryDate, DateTime deadlineUtc)
        {
            return new OrderWindowDecision
            {
                IsOpen = isOpen,
                EffectiveMode = mode,
                DeliveryDate = deliveryDate.Date,
                DeadlineUtc = deadlineUtc
            };
        }
    }

    public sealed class OrderWindowClosedException : Exception
    {
        public OrderWindowClosedException() : base("Sipariş penceresi kapalı.") { }
    }

    public sealed class OrderRevisionConflictException : Exception
    {
        public OrderRevisionConflictException() : base("Sipariş başka bir işlem tarafından güncellendi.") { }
    }

    public sealed class IdempotencyConflictException : Exception
    {
        public IdempotencyConflictException() : base("Idempotency anahtarı farklı bir istek için kullanılmış.") { }
    }
}
