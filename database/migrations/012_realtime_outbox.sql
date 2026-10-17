-- SQL Server 2005: durable invalidation only, no customer data.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Run only in EkmekSiparis.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=11)
BEGIN
    RAISERROR(N'Apply migration 011 first.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=12)
BEGIN
    BEGIN TRANSACTION;
    CREATE TABLE dbo.RealtimeOutbox (
        EventId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RealtimeOutbox PRIMARY KEY,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_RealtimeOutbox_CreatedAt DEFAULT GETDATE()
    );
    CREATE INDEX IX_RealtimeOutbox_CreatedAt ON dbo.RealtimeOutbox(CreatedAt);
    INSERT INTO dbo.SchemaMigrations(VersionNumber) VALUES(12);
    COMMIT TRANSACTION;
END;
