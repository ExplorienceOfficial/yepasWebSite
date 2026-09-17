using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Yepas.Api.Domain;
using Yepas.Api.Models;

namespace Yepas.Api.Data
{
    public sealed class OrderRepository
    {
        public OrderWindowSettings ReadSettings(out DateTime databaseUtcNow)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                return ReadSettings(connection, null, false, out databaseUtcNow);
            }
        }

        public HashSet<string> ReadAccessibleProductKeys(int legacyMbId)
        {
            var keys = new HashSet<string>(StringComparer.Ordinal);
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            using (var command = new SqlCommand(@"
SELECT UStokId, AStokId
FROM dbo.CustomerProductAccess
WHERE LegacyMbId = @mbId AND IsActive = 1", connection))
            {
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                connection.Open();
                using (var reader = command.ExecuteReader())
                    while (reader.Read()) keys.Add(ProductKey(reader.GetInt32(0), reader.GetInt32(1)));
            }
            return keys;
        }

        public OrderView ReadOrder(int legacyMbId, DateTime deliveryDate)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                return ReadOrder(connection, null, legacyMbId, deliveryDate);
            }
        }

        public OrderSettingsView ReadSettingsView()
        {
            DateTime ignored;
            var setting = ReadSettings(out ignored);
            return SettingsView(setting);
        }

        public OrderSettingsView UpdateSettings(int actorUserId, int cutoffMinute,
            string overrideMode, DateTime? overrideUntilUtc, string reason)
        {
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    using (var update = new SqlCommand(@"
UPDATE dbo.OrderSettings
SET CutoffMinute = @cutoff, OverrideMode = @mode,
    OverrideUntilUtc = @until, OverrideReason = @reason,
    UpdatedByUserId = @userId, UpdatedAtUtc = GETUTCDATE()
WHERE SettingsId = 1;
INSERT INTO dbo.OrderWindowAudit
    (CutoffMinute, OverrideMode, OverrideUntilUtc, Reason, ActorUserId)
VALUES (@cutoff, @mode, @until, @reason, @userId);", connection, transaction))
                    {
                        update.Parameters.Add("@cutoff", SqlDbType.SmallInt).Value = cutoffMinute;
                        update.Parameters.Add("@mode", SqlDbType.NVarChar, 10).Value = overrideMode;
                        update.Parameters.Add("@until", SqlDbType.DateTime).Value =
                            overrideUntilUtc.HasValue ? (object)overrideUntilUtc.Value : DBNull.Value;
                        update.Parameters.Add("@reason", SqlDbType.NVarChar, 300).Value =
                            String.IsNullOrWhiteSpace(reason) ? (object)DBNull.Value : reason.Trim();
                        update.Parameters.Add("@userId", SqlDbType.Int).Value = actorUserId;
                        update.ExecuteNonQuery();
                    }
                    transaction.Commit();
                }
            }
            return ReadSettingsView();
        }

        public OrderView SaveCustomerOrder(int userId, LegacyCustomerSchedule schedule,
            SaveCustomerOrderRequest input, string status, IList<PreparedOrderLine> lines,
            string idempotencyKey, byte[] requestHash)
        {
            int orderId;
            DateTime deliveryDate;
            using (var connection = new SqlConnection(DatabaseConnections.Application()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    var replayOrderId = ReadIdempotency(connection, transaction, userId,
                        idempotencyKey, requestHash);
                    if (replayOrderId.HasValue)
                    {
                        var replay = ReadOrderById(connection, transaction, replayOrderId.Value);
                        transaction.Commit();
                        return replay;
                    }

                    DateTime databaseUtcNow;
                    var settings = ReadSettings(connection, transaction, true, out databaseUtcNow);
                    var window = OrderWindowPolicy.Evaluate(schedule, settings, databaseUtcNow);
                    if (!window.IsOpen) throw new OrderWindowClosedException();
                    deliveryDate = window.DeliveryDate;

                    int existingRevision;
                    var existingOrderId = FindOrderForUpdate(connection, transaction,
                        schedule.LegacyMbId, deliveryDate, out existingRevision);
                    if (existingOrderId.HasValue)
                    {
                        if (!input.Revision.HasValue || input.Revision.Value != existingRevision)
                            throw new OrderRevisionConflictException();
                        orderId = existingOrderId.Value;
                        using (var update = new SqlCommand(@"
UPDATE dbo.Orders SET
    LegacyCustomerId = @customerId, LegacyDepartmentId = @departmentId,
    LegacyPersonnelId = @personnelId, Status = @status,
    Revision = Revision + 1, Note = @note, SourceRole = N'CUSTOMER',
    IntegrationStatus = @integration, LegacyReceiptId = NULL,
    UpdatedByUserId = @userId, UpdatedAtUtc = GETUTCDATE()
WHERE OrderId = @orderId", connection, transaction))
                        {
                            AddOrderParameters(update, userId, schedule, status, input.Note);
                            update.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                            update.ExecuteNonQuery();
                        }
                        using (var delete = new SqlCommand(
                            "DELETE FROM dbo.OrderLines WHERE OrderId = @orderId", connection, transaction))
                        {
                            delete.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                            delete.ExecuteNonQuery();
                        }
                    }
                    else
                    {
                        if (input.Revision.HasValue && input.Revision.Value != 0)
                            throw new OrderRevisionConflictException();
                        using (var insert = new SqlCommand(@"
INSERT INTO dbo.Orders
    (LegacyMbId, LegacyCustomerId, LegacyDepartmentId, LegacyPersonnelId,
     DeliveryDate, Status, Revision, Note, SourceRole, IntegrationStatus,
     CreatedByUserId, UpdatedByUserId)
VALUES
    (@mbId, @customerId, @departmentId, @personnelId,
     @deliveryDate, @status, 1, @note, N'CUSTOMER', @integration,
     @userId, @userId);
SELECT CAST(SCOPE_IDENTITY() AS INT);", connection, transaction))
                        {
                            AddOrderParameters(insert, userId, schedule, status, input.Note);
                            insert.Parameters.Add("@mbId", SqlDbType.Int).Value = schedule.LegacyMbId;
                            insert.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate;
                            orderId = (int)insert.ExecuteScalar();
                        }
                    }

                    foreach (var line in lines) InsertLine(connection, transaction, orderId, line);
                    var revision = existingOrderId.HasValue ? existingRevision + 1 : 1;
                    using (var audit = new SqlCommand(@"
INSERT INTO dbo.OrderAudit
    (OrderId, Revision, ActionCode, Status, ActorUserId, ActorRole, Reason)
VALUES (@orderId, @revision, @action, @status, @userId, N'CUSTOMER', NULL)", connection, transaction))
                    {
                        audit.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                        audit.Parameters.Add("@revision", SqlDbType.Int).Value = revision;
                        audit.Parameters.Add("@action", SqlDbType.NVarChar, 20).Value =
                            existingOrderId.HasValue ? "UPDATED" : "CREATED";
                        audit.Parameters.Add("@status", SqlDbType.NVarChar, 20).Value = status;
                        audit.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                        audit.ExecuteNonQuery();
                    }
                    using (var idempotency = new SqlCommand(@"
INSERT INTO dbo.OrderIdempotency
    (UserId, IdempotencyKey, RequestHash, OrderId)
VALUES (@userId, @key, @hash, @orderId)", connection, transaction))
                    {
                        idempotency.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                        idempotency.Parameters.Add("@key", SqlDbType.NVarChar, 100).Value = idempotencyKey;
                        idempotency.Parameters.Add("@hash", SqlDbType.VarBinary, 32).Value = requestHash;
                        idempotency.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                        idempotency.ExecuteNonQuery();
                    }
                    var result = ReadOrderById(connection, transaction, orderId);
                    transaction.Commit();
                    return result;
                }
            }
        }

        private static OrderWindowSettings ReadSettings(SqlConnection connection,
            SqlTransaction transaction, bool lockRow, out DateTime databaseUtcNow)
        {
            var hint = lockRow ? " WITH (UPDLOCK, HOLDLOCK)" : String.Empty;
            using (var command = new SqlCommand(@"
SELECT CutoffMinute, OverrideMode, OverrideUntilUtc, OverrideReason,
       UpdatedAtUtc, GETUTCDATE()
FROM dbo.OrderSettings" + hint + " WHERE SettingsId = 1", connection, transaction))
            using (var reader = command.ExecuteReader())
            {
                if (!reader.Read()) throw new InvalidOperationException("Sipariş ayarı bulunamadı.");
                var value = new OrderWindowSettings
                {
                    CutoffMinute = reader.GetInt16(0),
                    OverrideMode = reader.GetString(1),
                    OverrideUntilUtc = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2),
                    OverrideReason = reader.IsDBNull(3) ? null : reader.GetString(3),
                    UpdatedAtUtc = reader.GetDateTime(4)
                };
                databaseUtcNow = reader.GetDateTime(5);
                return value;
            }
        }

        private static int? ReadIdempotency(SqlConnection connection, SqlTransaction transaction,
            int userId, string key, byte[] hash)
        {
            using (var command = new SqlCommand(@"
SELECT RequestHash, OrderId
FROM dbo.OrderIdempotency WITH (UPDLOCK, HOLDLOCK)
WHERE UserId = @userId AND IdempotencyKey = @key", connection, transaction))
            {
                command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
                command.Parameters.Add("@key", SqlDbType.NVarChar, 100).Value = key;
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    var stored = (byte[])reader[0];
                    if (!Equal(stored, hash)) throw new IdempotencyConflictException();
                    return reader.GetInt32(1);
                }
            }
        }

        private static int? FindOrderForUpdate(SqlConnection connection, SqlTransaction transaction,
            int legacyMbId, DateTime deliveryDate, out int revision)
        {
            revision = 0;
            using (var command = new SqlCommand(@"
SELECT OrderId, Revision FROM dbo.Orders WITH (UPDLOCK, HOLDLOCK)
WHERE LegacyMbId = @mbId AND DeliveryDate = @deliveryDate", connection, transaction))
            {
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    revision = reader.GetInt32(1);
                    return reader.GetInt32(0);
                }
            }
        }

        private static void AddOrderParameters(SqlCommand command, int userId,
            LegacyCustomerSchedule schedule, string status, string note)
        {
            command.Parameters.Add("@customerId", SqlDbType.Int).Value = schedule.LegacyCustomerId;
            command.Parameters.Add("@departmentId", SqlDbType.Int).Value = schedule.LegacyDepartmentId;
            command.Parameters.Add("@personnelId", SqlDbType.Int).Value = schedule.LegacyPersonnelId;
            command.Parameters.Add("@status", SqlDbType.NVarChar, 20).Value = status;
            command.Parameters.Add("@note", SqlDbType.NVarChar, 500).Value =
                String.IsNullOrWhiteSpace(note) ? (object)DBNull.Value : note.Trim();
            command.Parameters.Add("@integration", SqlDbType.NVarChar, 20).Value =
                status == "SUBMITTED" ? "PENDING" : "NOT_REQUIRED";
            command.Parameters.Add("@userId", SqlDbType.Int).Value = userId;
        }

        private static void InsertLine(SqlConnection connection, SqlTransaction transaction,
            int orderId, PreparedOrderLine line)
        {
            using (var command = new SqlCommand(@"
INSERT INTO dbo.OrderLines
    (OrderId, UStokId, AStokId, Quantity, ProductCode, ProductName, VariantName)
VALUES
    (@orderId, @uStokId, @aStokId, @quantity, @code, @name, @variant)", connection, transaction))
            {
                command.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                command.Parameters.Add("@uStokId", SqlDbType.Int).Value = line.UStokId;
                command.Parameters.Add("@aStokId", SqlDbType.Int).Value = line.AStokId;
                command.Parameters.Add("@quantity", SqlDbType.Int).Value = line.Quantity;
                command.Parameters.Add("@code", SqlDbType.NVarChar, 50).Value = line.ProductCode;
                command.Parameters.Add("@name", SqlDbType.NVarChar, 200).Value = line.ProductName;
                command.Parameters.Add("@variant", SqlDbType.NVarChar, 200).Value =
                    String.IsNullOrWhiteSpace(line.VariantName) ? (object)DBNull.Value : line.VariantName;
                command.ExecuteNonQuery();
            }
        }

        private static OrderView ReadOrder(SqlConnection connection, SqlTransaction transaction,
            int legacyMbId, DateTime deliveryDate)
        {
            using (var command = new SqlCommand(@"
SELECT OrderId FROM dbo.Orders
WHERE LegacyMbId = @mbId AND DeliveryDate = @deliveryDate", connection, transaction))
            {
                command.Parameters.Add("@mbId", SqlDbType.Int).Value = legacyMbId;
                command.Parameters.Add("@deliveryDate", SqlDbType.DateTime).Value = deliveryDate.Date;
                var id = command.ExecuteScalar();
                return id == null ? null : ReadOrderById(connection, transaction, (int)id);
            }
        }

        private static OrderView ReadOrderById(SqlConnection connection, SqlTransaction transaction, int orderId)
        {
            OrderView order;
            using (var command = new SqlCommand(@"
SELECT OrderId, LegacyMbId, DeliveryDate, Status, Revision, Note, UpdatedAtUtc
FROM dbo.Orders WHERE OrderId = @orderId", connection, transaction))
            {
                command.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                using (var reader = command.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    order = new OrderView
                    {
                        OrderId = reader.GetInt32(0),
                        LegacyMbId = reader.GetInt32(1),
                        DeliveryDate = reader.GetDateTime(2),
                        Status = reader.GetString(3),
                        Revision = reader.GetInt32(4),
                        Note = reader.IsDBNull(5) ? null : reader.GetString(5),
                        UpdatedAtUtc = reader.GetDateTime(6),
                        Lines = new List<OrderLineView>()
                    };
                }
            }
            using (var command = new SqlCommand(@"
SELECT UStokId, AStokId, Quantity, ProductCode, ProductName, VariantName
FROM dbo.OrderLines WHERE OrderId = @orderId
ORDER BY ProductName, VariantName, UStokId, AStokId", connection, transaction))
            {
                command.Parameters.Add("@orderId", SqlDbType.Int).Value = orderId;
                using (var reader = command.ExecuteReader())
                    while (reader.Read())
                        order.Lines.Add(new OrderLineView
                        {
                            UStokId = reader.GetInt32(0),
                            AStokId = reader.GetInt32(1),
                            Quantity = reader.GetInt32(2),
                            ProductCode = reader.GetString(3),
                            ProductName = reader.GetString(4),
                            VariantName = reader.IsDBNull(5) ? null : reader.GetString(5)
                        });
            }
            return order;
        }

        private static bool Equal(byte[] left, byte[] right)
        {
            if (left == null || right == null || left.Length != right.Length) return false;
            var difference = 0;
            for (var index = 0; index < left.Length; index++) difference |= left[index] ^ right[index];
            return difference == 0;
        }

        private static string ProductKey(int uStokId, int aStokId)
        {
            return uStokId.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" +
                aStokId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        private static OrderSettingsView SettingsView(OrderWindowSettings settings)
        {
            var hours = settings.CutoffMinute / 60;
            var minutes = settings.CutoffMinute % 60;
            return new OrderSettingsView
            {
                CutoffMinute = settings.CutoffMinute,
                CutoffTime = hours.ToString("00") + ":" + minutes.ToString("00"),
                OverrideMode = settings.OverrideMode,
                OverrideUntilUtc = settings.OverrideUntilUtc,
                OverrideReason = settings.OverrideReason,
                UpdatedAtUtc = settings.UpdatedAtUtc
            };
        }
    }
}
