-- SQL Server 2005 uyumlu şoför hesabı yönetim denetim kaydı.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 5)
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.DriverManagementAudit (
        AuditId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        LegacyPersonnelId INT NOT NULL,
        TargetUserId INT NULL,
        ActionCode NVARCHAR(30) NOT NULL,
        ActorUserId INT NOT NULL,
        OccurredAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT FK_DriverManagementAudit_TargetUser FOREIGN KEY (TargetUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_DriverManagementAudit_ActorUser FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_DriverManagementAudit_PersonnelDate
        ON dbo.DriverManagementAudit(LegacyPersonnelId, OccurredAtUtc);

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (5);
    COMMIT TRANSACTION;
END;
