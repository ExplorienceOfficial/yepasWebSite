-- SQL Server 2005: 00:01 görevinde işlemi yapan gerçek kullanıcı bulunmaz.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 8)
BEGIN
    BEGIN TRANSACTION;
    ALTER TABLE dbo.OrderFinalizations ALTER COLUMN StartedByUserId INT NULL;
    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (8);
    COMMIT TRANSACTION;
END;
