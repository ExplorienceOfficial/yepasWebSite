-- SQL Server 2005 uyumlu sipariş senkronizasyon zamanı.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 7)
BEGIN
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.Orders', N'LastExportedAtUtc') IS NULL
        ALTER TABLE dbo.Orders ADD LastExportedAtUtc DATETIME NULL;

    IF COL_LENGTH(N'dbo.Orders', N'LastExportedRevision') IS NULL
        ALTER TABLE dbo.Orders ADD LastExportedRevision INT NULL;

    UPDATE O
    SET O.LastExportedAtUtc = (
            SELECT MAX(F.FinalizedAtUtc)
            FROM dbo.OrderFinalizations F
            WHERE F.DeliveryDate = O.DeliveryDate
        ),
        O.LastExportedRevision = O.Revision
    FROM dbo.Orders O
    WHERE O.IntegrationStatus = N'EXPORTED'
      AND O.LastExportedAtUtc IS NULL
      AND EXISTS (
          SELECT 1
          FROM dbo.OrderFinalizations F
          WHERE F.DeliveryDate = O.DeliveryDate
            AND F.FinalizedAtUtc IS NOT NULL
      );

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (7);
    COMMIT TRANSACTION;
END;
