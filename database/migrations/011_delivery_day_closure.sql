-- SQL Server 2005. Only automatic daily export closes a delivery day.
-- FINALIZED alone does not mean closed: manual exports remain editable.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Run this migration only in EkmekSiparis.', 16, 1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=10)
BEGIN
    RAISERROR(N'Apply migration 010 first.', 16, 1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=11)
BEGIN
    BEGIN TRANSACTION;
    ALTER TABLE dbo.OrderFinalizations ADD ClosedAt DATETIME NULL;
    -- Do not label historical manual exports as automatic closures.
    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (11);
    COMMIT TRANSACTION;
END;
