-- SQL Server 2005: yalnız EkmekSiparis içinde mobil fiş sahipliğini saklar.
-- Eski fişin kaynak Orders satırı silinse bile hangi fişin bize ait olduğunu biliriz.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 9)
BEGIN
    RAISERROR(N'Önce 009 saat migration betiği uygulanmalıdır.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 10)
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.MobileReceiptRegistry (
        LegacyReceiptId INT NOT NULL PRIMARY KEY,
        LegacyMbId INT NOT NULL,
        LegacyCustomerId INT NOT NULL,
        LegacyDepartmentId INT NOT NULL,
        DeliveryDate DATETIME NOT NULL,
        LastSyncedRevision INT NOT NULL,
        NeedsSync BIT NOT NULL DEFAULT (0),
        CONSTRAINT UQ_MobileReceiptRegistry_MbDelivery UNIQUE (LegacyMbId, DeliveryDate)
    );
    CREATE INDEX IX_MobileReceiptRegistry_DeliveryDate
        ON dbo.MobileReceiptRegistry (DeliveryDate, NeedsSync);

    -- Mevcut mobil fiş bağlantıları güvenli başlangıç kümesidir. Aynı fişin
    -- iki siparişe bağlı olması halinde UNIQUE ihlali migration'ı geri alır.
    INSERT INTO dbo.MobileReceiptRegistry
        (LegacyReceiptId, LegacyMbId, LegacyCustomerId, LegacyDepartmentId,
         DeliveryDate, LastSyncedRevision, NeedsSync)
    SELECT LegacyReceiptId, LegacyMbId, LegacyCustomerId, LegacyDepartmentId,
           DeliveryDate, ISNULL(LastExportedRevision, 0),
           CASE WHEN IntegrationStatus IN (N'PENDING', N'FAILED') THEN 1 ELSE 0 END
    FROM dbo.Orders
    WHERE LegacyReceiptId IS NOT NULL;

    -- Sipariş aktif ara tablodan kaldırıldığında denetim geçmişi kalır.
    -- Eski denetim satırları da şube/gün bağlamını kaybetmez.
    ALTER TABLE dbo.OrderAudit ADD LegacyMbId INT NULL, DeliveryDate DATETIME NULL;
    EXEC sp_executesql N'
        UPDATE A SET LegacyMbId=O.LegacyMbId, DeliveryDate=O.DeliveryDate
        FROM dbo.OrderAudit A INNER JOIN dbo.Orders O ON O.OrderId=A.OrderId;';
    ALTER TABLE dbo.OrderAudit DROP CONSTRAINT FK_OrderAudit_Order;

    -- Silinmiş bir siparişin eski istek anahtarları korunur: eski bir isteğin
    -- tekrar gönderilmesi siparişi kazara yeniden oluşturamaz.
    ALTER TABLE dbo.OrderIdempotency ADD
        ResultStatus NVARCHAR(20) NULL,
        ResultLegacyMbId INT NULL,
        ResultDeliveryDate DATETIME NULL;
    ALTER TABLE dbo.OrderIdempotency DROP CONSTRAINT FK_OrderIdempotency_Order;

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (10);
    COMMIT TRANSACTION;
END;
