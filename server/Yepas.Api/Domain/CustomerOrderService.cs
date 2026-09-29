using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Yepas.Api.Data;
using Yepas.Api.Models;

namespace Yepas.Api.Domain
{
    public sealed class CustomerOrderService
    {
        private readonly OrderRepository orders = new OrderRepository();
        private readonly LegacyCustomerScheduleReader schedules = new LegacyCustomerScheduleReader();
        private readonly LegacyCustomerProductReader customerProducts =
            new LegacyCustomerProductReader();

        public CustomerOrderContextView GetContext(int legacyMbId)
        {
            var schedule = schedules.Read(legacyMbId);
            if (schedule == null) return null;

            DateTime databaseUtcNow;
            var settings = orders.ReadSettings(out databaseUtcNow);
            var decision = OrderWindowPolicy.Evaluate(schedule, settings, databaseUtcNow);
            var products = customerProducts.Read(schedule.LegacyMbId);

            return new CustomerOrderContextView
            {
                LegacyMbId = legacyMbId,
                DeliveryDate = decision.DeliveryDate,
                Window = new OrderWindowView
                {
                    IsOpen = decision.IsOpen,
                    Mode = decision.EffectiveMode,
                    CutoffMinute = settings.CutoffMinute,
                    DeadlineUtc = decision.DeadlineUtc,
                    OverrideUntilUtc = settings.OverrideUntilUtc
                },
                Products = products,
                Order = orders.ReadOrder(legacyMbId, decision.DeliveryDate)
            };
        }

        public OrderView Save(int userId, int legacyMbId, SaveCustomerOrderRequest input,
            string idempotencyKey)
        {
            LegacyCustomerSchedule schedule;
            string status;
            IList<PreparedOrderLine> prepared;
            Prepare(legacyMbId, input, idempotencyKey, out schedule, out status, out prepared);
            return orders.SaveCustomerOrder(userId, schedule, input, status, prepared,
                idempotencyKey.Trim(), RequestHash(legacyMbId, input, status, null));
        }

        public CustomerOrderContextView GetAdminContext(int legacyMbId)
        {
            var schedule = schedules.Read(legacyMbId);
            if (schedule == null) return null;
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            var deliveryDate = databaseUtcNow.AddHours(3).Date.AddDays(1);
            if (!IsDistributionDay(schedule, deliveryDate))
                throw new ArgumentException("Şubenin yarın için SG dağıtım günü bulunmuyor.");
            return new CustomerOrderContextView
            {
                LegacyMbId = legacyMbId,
                DeliveryDate = deliveryDate,
                Window = new OrderWindowView { IsOpen = true, Mode = "ADMIN" },
                Products = customerProducts.Read(schedule.LegacyMbId),
                Order = orders.ReadOrder(legacyMbId, deliveryDate)
            };
        }

        public OrderView SaveAdmin(int userId, int legacyMbId, SaveCustomerOrderRequest input,
            string idempotencyKey)
        {
            LegacyCustomerSchedule schedule;
            string status;
            IList<PreparedOrderLine> prepared;
            Prepare(legacyMbId, input, idempotencyKey, out schedule, out status, out prepared);
            DateTime databaseUtcNow;
            orders.ReadSettings(out databaseUtcNow);
            var deliveryDate = databaseUtcNow.AddHours(3).Date.AddDays(1);
            if (!IsDistributionDay(schedule, deliveryDate))
                throw new ArgumentException("Şubenin yarın için SG dağıtım günü bulunmuyor.");
            return orders.SaveAdminOrder(userId, schedule, input, status, prepared,
                idempotencyKey.Trim(), RequestHash(legacyMbId, input, status, deliveryDate),
                deliveryDate);
        }

        private void Prepare(int legacyMbId, SaveCustomerOrderRequest input, string idempotencyKey,
            out LegacyCustomerSchedule schedule, out string status,
            out IList<PreparedOrderLine> preparedLines)
        {
            if (input == null) throw new ArgumentException("Sipariş gövdesi zorunludur.");
            status = String.IsNullOrWhiteSpace(input.Status)
                ? null : input.Status.Trim().ToUpperInvariant();
            if (status != "SUBMITTED" && status != "NO_PRODUCT" && status != "CANCELLED")
                throw new ArgumentException("Geçersiz sipariş durumu.");
            if (input.Note != null && input.Note.Length > 500)
                throw new ArgumentException("Sipariş notu en fazla 500 karakter olabilir.");
            if (String.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length > 100)
                throw new ArgumentException("Geçerli bir Idempotency-Key başlığı zorunludur.");

            schedule = schedules.Read(legacyMbId);
            if (schedule == null) throw new KeyNotFoundException("Müşteri operasyon kaydı bulunamadı.");

            var products = customerProducts.Read(schedule.LegacyMbId);
            preparedLines = OrderSubmissionPolicy.Prepare(status, input.Lines, products);
        }

        private static bool IsDistributionDay(LegacyCustomerSchedule schedule, DateTime date)
        {
            var index = date.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)date.DayOfWeek - 1;
            return schedule.DistributionDays != null && schedule.DistributionDays.Length == 7 &&
                schedule.DistributionDays[index];
        }

        private static byte[] RequestHash(int legacyMbId, SaveCustomerOrderRequest input,
            string status, DateTime? deliveryDate)
        {
            var builder = new StringBuilder();
            builder.Append(legacyMbId).Append('|').Append(input.Revision.GetValueOrDefault(0))
                .Append('|').Append(status).Append('|').Append(input.Note ?? String.Empty);
            if (deliveryDate.HasValue)
                builder.Append('|').Append(deliveryDate.Value.ToString("yyyyMMdd"));
            foreach (var line in (input.Lines ?? new List<OrderLineInput>())
                .OrderBy(item => item.UStokId).ThenBy(item => item.AStokId))
                builder.Append('|').Append(line.UStokId).Append(':').Append(line.AStokId)
                    .Append(':').Append(line.Quantity);
            using (var sha = SHA256.Create())
                return sha.ComputeHash(Encoding.UTF8.GetBytes(builder.ToString()));
        }
    }
}
