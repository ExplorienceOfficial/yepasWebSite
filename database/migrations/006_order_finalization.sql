-- SQL Server 2005 uyumlu günlük sipariş senkronizasyon durumu.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 6)
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.OrderFinalizations (
        FinalizationId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DeliveryDate DATETIME NOT NULL,
        State NVARCHAR(20) NOT NULL,
        OrderCount INT NOT NULL DEFAULT (0),
        LineCount INT NOT NULL DEFAULT (0),
        TotalQuantity INT NOT NULL DEFAULT (0),
        AttemptCount INT NOT NULL DEFAULT (1),
        StartedByUserId INT NOT NULL,
        StartedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        LastAttemptAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        FinalizedAtUtc DATETIME NULL,
        LastError NVARCHAR(500) NULL,
        CONSTRAINT UQ_OrderFinalizations_Delivery UNIQUE (DeliveryDate),
        CONSTRAINT CK_OrderFinalizations_State CHECK (State IN (N'FINALIZING', N'FINALIZED', N'FAILED')),
        CONSTRAINT FK_OrderFinalizations_User FOREIGN KEY (StartedByUserId) REFERENCES dbo.Users(UserId)
    );

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (6);
    COMMIT TRANSACTION;
END;
