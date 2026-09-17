-- SQL Server 2005 uyumlu çok şubeli müşteri hesap yönetimi denetim şeması.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 4)
BEGIN
    BEGIN TRANSACTION;

    -- Bir hesap birden fazla şubeye bağlanabilir; her MB_ID ise tek hesaba bağlıdır.
    CREATE UNIQUE INDEX UQ_CustomerAccess_LegacyMbId
        ON dbo.CustomerAccess(LegacyMbId);

    CREATE TABLE dbo.CustomerManagementAudit (
        AuditId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        LegacyMbId INT NOT NULL,
        TargetUserId INT NULL,
        ActionCode NVARCHAR(30) NOT NULL,
        Detail NVARCHAR(500) NULL,
        ActorUserId INT NOT NULL,
        OccurredAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT FK_CustomerManagementAudit_TargetUser FOREIGN KEY (TargetUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_CustomerManagementAudit_ActorUser FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_CustomerManagementAudit_MbDate
        ON dbo.CustomerManagementAudit(LegacyMbId, OccurredAtUtc);

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (4);
    COMMIT TRANSACTION;
END;
