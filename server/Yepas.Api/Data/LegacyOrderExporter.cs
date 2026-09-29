using System;
using System.Data;
using System.Data.SqlClient;

namespace Yepas.Api.Data
{
    public sealed class LegacyOrderExporter
    {
        public int Export(LegacyExportOrder order)
        {
            if (order == null || order.Lines == null)
                throw new InvalidOperationException("Aktarılacak sipariş bulunmuyor.");
            var submitted = String.Equals(order.Status, "SUBMITTED", StringComparison.Ordinal);
            if (submitted && order.Lines.Count == 0)
                throw new InvalidOperationException("Aktarılacak sipariş satırı bulunmuyor.");
            if (!submitted && !order.LegacyReceiptId.HasValue)
                throw new InvalidOperationException("İptal edilecek mobil fiş bağlantısı bulunmuyor.");
            using (var connection = new SqlConnection(DatabaseConnections.Catalog()))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction(IsolationLevel.Serializable))
                {
                    AcquireLock(connection, transaction, order.UpdatedAtUtc.AddHours(3).Date);
                    var receiptId = FindReceipt(connection, transaction, order);
                    if (!receiptId.HasValue)
                    {
                        if (!submitted)
                            throw new InvalidOperationException("İptal edilecek mobil fiş bulunamadı.");
                        receiptId = InsertReceipt(connection, transaction, order);
                    }
                    else
                        UpdateReceipt(connection, transaction, receiptId.Value, order);

                    using (var delete = new SqlCommand(
                        "DELETE FROM D00013.RS_FIS_SATIRLARI WHERE FIS_ID=@id", connection, transaction))
                    {
                        delete.Parameters.Add("@id", SqlDbType.Int).Value = receiptId.Value;
                        delete.ExecuteNonQuery();
                    }
                    foreach (var line in order.Lines)
                        using (var insert = new SqlCommand(@"
INSERT INTO D00013.RS_FIS_SATIRLARI (FIS_ID,U_STOK_ID,A_STOK_ID,MIKTAR)
VALUES (@receipt,@uStok,@aStok,@quantity)", connection, transaction))
                        {
                            insert.Parameters.Add("@receipt", SqlDbType.Int).Value = receiptId.Value;
                            insert.Parameters.Add("@uStok", SqlDbType.Int).Value = line.UStokId;
                            insert.Parameters.Add("@aStok", SqlDbType.Int).Value = line.AStokId;
                            insert.Parameters.Add("@quantity", SqlDbType.Int).Value = line.Quantity;
                            insert.ExecuteNonQuery();
                        }
                    transaction.Commit();
                    return receiptId.Value;
                }
            }
        }

        private static void AcquireLock(SqlConnection connection, SqlTransaction transaction,
            DateTime localCreationDate)
        {
            using (var command = new SqlCommand(@"
DECLARE @result INT;
EXEC @result=sp_getapplock @Resource=@resource, @LockMode='Exclusive',
     @LockOwner='Transaction', @LockTimeout=15000;
SELECT @result;", connection, transaction))
            {
                command.Parameters.Add("@resource", SqlDbType.NVarChar, 255).Value =
                    "YepasMobileFisNumber-" + localCreationDate.ToString("yyyyMMdd");
                if (Convert.ToInt32(command.ExecuteScalar()) < 0)
                    throw new InvalidOperationException("Eski sistem fiş kilidi alınamadı.");
            }
        }

        private static int? FindReceipt(SqlConnection connection, SqlTransaction transaction,
            LegacyExportOrder order)
        {
            if (order.LegacyReceiptId.HasValue)
            {
                using (var byId = new SqlCommand(@"
SELECT ID
FROM D00013.RS_FIS_BILGILERI WITH (UPDLOCK,HOLDLOCK)
WHERE ID=@receiptId
  AND O_KULLANICI='MOBIL' AND FIS_NO LIKE 'U-%'
  AND DTTARIH=@deliveryDate
  AND MUSTERI_ID=@customer AND BOLUM_ID=@department", connection, transaction))
                {
                    byId.Parameters.Add("@receiptId", SqlDbType.Int).Value = order.LegacyReceiptId.Value;
                    AddIdentityParameters(byId, order);
                    var existing = byId.ExecuteScalar();
                    if (existing != null) return Convert.ToInt32(existing);
                    throw new InvalidOperationException(
                        "Kayıtlı eski sistem fişi bulunamadı veya mobil uygulamaya ait değil.");
                }
            }
            using (var command = new SqlCommand(@"
SELECT TOP 1 ID
FROM D00013.RS_FIS_BILGILERI WITH (UPDLOCK,HOLDLOCK)
WHERE O_KULLANICI='MOBIL' AND FIS_NO LIKE 'U-%' AND DTTARIH=@deliveryDate
  AND PERSONEL_ID=@personnel AND MUSTERI_ID=@customer AND BOLUM_ID=@department
ORDER BY ID", connection, transaction))
            {
                AddIdentityParameters(command, order);
                var result = command.ExecuteScalar();
                return result == null ? (int?)null : Convert.ToInt32(result);
            }
        }

        private static int InsertReceipt(SqlConnection connection, SqlTransaction transaction,
            LegacyExportOrder order)
        {
            var localNow = order.UpdatedAtUtc.AddHours(3);
            var next = 1;
            using (var command = new SqlCommand(@"
SELECT ISNULL(MAX(CASE
    WHEN FIS_NO LIKE 'U-%' AND ISNUMERIC(SUBSTRING(FIS_NO,3,4))=1
    THEN CONVERT(INT,SUBSTRING(FIS_NO,3,4)) ELSE 0 END),0)+1
FROM D00013.RS_FIS_BILGILERI WITH (UPDLOCK,HOLDLOCK)
WHERE O_KULLANICI='MOBIL' AND O_TARIHI>=@dayStart AND O_TARIHI<@dayEnd", connection, transaction))
            {
                command.Parameters.Add("@dayStart", SqlDbType.SmallDateTime).Value = localNow.Date;
                command.Parameters.Add("@dayEnd", SqlDbType.SmallDateTime).Value = localNow.Date.AddDays(1);
                next = Convert.ToInt32(command.ExecuteScalar());
            }
            if (next > 9999) throw new InvalidOperationException("Günlük mobil fiş numarası sınırı aşıldı.");
            using (var command = new SqlCommand(@"
INSERT INTO D00013.RS_FIS_BILGILERI
    (DTTARIH,FIS_NO,PERSONEL_ID,MUSTERI_ID,BOLUM_ID,BIREYSEL_ID,
     O_KULLANICI,O_TARIHI,D_KULLANICI,D_TARIHI,ST,SNG_1,SNG_2,SNG_3)
VALUES
    (@deliveryDate,@number,@personnel,@customer,@department,0,
     'MOBIL',@created,NULL,NULL,1,NULL,NULL,NULL);
SELECT CAST(SCOPE_IDENTITY() AS INT);", connection, transaction))
            {
                AddIdentityParameters(command, order);
                command.Parameters.Add("@number", SqlDbType.VarChar, 6).Value = "U-" + next;
                command.Parameters.Add("@created", SqlDbType.SmallDateTime).Value = localNow;
                return Convert.ToInt32(command.ExecuteScalar());
            }
        }

        private static void UpdateReceipt(SqlConnection connection, SqlTransaction transaction,
            int receiptId, LegacyExportOrder order)
        {
            using (var command = new SqlCommand(@"
UPDATE D00013.RS_FIS_BILGILERI SET
    DTTARIH=@deliveryDate,PERSONEL_ID=@personnel,MUSTERI_ID=@customer,
    BOLUM_ID=@department,BIREYSEL_ID=0,O_KULLANICI='MOBIL',
    O_TARIHI=@orderUpdated,D_KULLANICI='MOBIL',D_TARIHI=@modified,
    ST=1,SNG_1=NULL,SNG_2=NULL,SNG_3=NULL
WHERE ID=@id
  AND O_KULLANICI='MOBIL' AND FIS_NO LIKE 'U-%'
  AND DTTARIH=@deliveryDate
  AND MUSTERI_ID=@customer AND BOLUM_ID=@department", connection, transaction))
            {
                AddIdentityParameters(command, order);
                command.Parameters.Add("@id", SqlDbType.Int).Value = receiptId;
                command.Parameters.Add("@modified", SqlDbType.SmallDateTime).Value =
                    DateTime.UtcNow.AddHours(3);
                command.Parameters.Add("@orderUpdated", SqlDbType.SmallDateTime).Value =
                    order.UpdatedAtUtc.AddHours(3);
                if (command.ExecuteNonQuery() != 1)
                    throw new InvalidOperationException("Eski sistem fişi güncellenemedi.");
            }
        }

        private static void AddIdentityParameters(SqlCommand command, LegacyExportOrder order)
        {
            command.Parameters.Add("@deliveryDate", SqlDbType.SmallDateTime).Value = order.DeliveryDate.Date;
            command.Parameters.Add("@personnel", SqlDbType.Int).Value = order.LegacyPersonnelId;
            command.Parameters.Add("@customer", SqlDbType.Int).Value = order.LegacyCustomerId;
            command.Parameters.Add("@department", SqlDbType.Int).Value = order.LegacyDepartmentId;
        }
    }
}
