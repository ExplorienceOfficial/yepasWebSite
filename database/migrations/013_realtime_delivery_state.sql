-- Notification-only checkpoint. Business writers never access this table.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Run only in EkmekSiparis.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=12)
BEGIN
    RAISERROR(N'Apply migration 012 first.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=13)
BEGIN
    BEGIN TRANSACTION;
    CREATE TABLE dbo.RealtimeDeliveryState (
        StateId INT NOT NULL CONSTRAINT PK_RealtimeDeliveryState PRIMARY KEY,
        DeliveredFingerprint BINARY(32) NULL,
        DeliveredAt DATETIME NULL,
        CONSTRAINT CK_RealtimeDeliveryState_Singleton CHECK(StateId=1)
    );
    INSERT INTO dbo.RealtimeDeliveryState(StateId) VALUES(1);
    INSERT INTO dbo.SchemaMigrations(VersionNumber) VALUES(13);
    COMMIT TRANSACTION;
END;
