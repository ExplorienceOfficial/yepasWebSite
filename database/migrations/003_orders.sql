-- SQL Server 2005 uyumlu sipariş çekirdeği.
-- Yalnızca EkmekSiparis veritabanında çalışır; PrestoPlus şemasına yazmaz.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 3)
BEGIN
    BEGIN TRANSACTION;

    CREATE TABLE dbo.OrderSettings (
        SettingsId TINYINT NOT NULL PRIMARY KEY,
        CutoffMinute SMALLINT NOT NULL,
        OverrideMode NVARCHAR(10) NOT NULL,
        OverrideUntilUtc DATETIME NULL,
        OverrideReason NVARCHAR(300) NULL,
        UpdatedByUserId INT NULL,
        UpdatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT CK_OrderSettings_Singleton CHECK (SettingsId = 1),
        CONSTRAINT CK_OrderSettings_Cutoff CHECK (CutoffMinute BETWEEN 0 AND 1439),
        CONSTRAINT CK_OrderSettings_Mode CHECK (OverrideMode IN (N'AUTO', N'OPEN', N'CLOSED')),
        CONSTRAINT FK_OrderSettings_User FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(UserId)
    );

    INSERT INTO dbo.OrderSettings
        (SettingsId, CutoffMinute, OverrideMode, OverrideUntilUtc, OverrideReason)
    VALUES (1, 1080, N'AUTO', NULL, NULL);

    CREATE TABLE dbo.OrderWindowAudit (
        AuditId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CutoffMinute SMALLINT NOT NULL,
        OverrideMode NVARCHAR(10) NOT NULL,
        OverrideUntilUtc DATETIME NULL,
        Reason NVARCHAR(300) NULL,
        ActorUserId INT NOT NULL,
        OccurredAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT FK_OrderWindowAudit_User FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId)
    );

    CREATE TABLE dbo.CustomerProductAccess (
        LegacyMbId INT NOT NULL,
        UStokId INT NOT NULL,
        AStokId INT NOT NULL DEFAULT (0),
        IsActive BIT NOT NULL DEFAULT (1),
        CreatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        UpdatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT PK_CustomerProductAccess PRIMARY KEY (LegacyMbId, UStokId, AStokId),
        CONSTRAINT CK_CustomerProductAccess_Ids CHECK (LegacyMbId > 0 AND UStokId > 0 AND AStokId >= 0)
    );

    CREATE TABLE dbo.Orders (
        OrderId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        LegacyMbId INT NOT NULL,
        LegacyCustomerId INT NOT NULL,
        LegacyDepartmentId INT NOT NULL,
        LegacyPersonnelId INT NOT NULL,
        DeliveryDate DATETIME NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        Revision INT NOT NULL DEFAULT (1),
        Note NVARCHAR(500) NULL,
        SourceRole NVARCHAR(20) NOT NULL,
        IntegrationStatus NVARCHAR(20) NOT NULL DEFAULT (N'PENDING'),
        LegacyReceiptId INT NULL,
        CreatedByUserId INT NOT NULL,
        UpdatedByUserId INT NOT NULL,
        CreatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        UpdatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT UQ_Orders_MbDelivery UNIQUE (LegacyMbId, DeliveryDate),
        CONSTRAINT CK_Orders_Status CHECK (Status IN (N'SUBMITTED', N'NO_PRODUCT', N'CANCELLED')),
        CONSTRAINT CK_Orders_Revision CHECK (Revision > 0),
        CONSTRAINT CK_Orders_SourceRole CHECK (SourceRole IN (N'CUSTOMER', N'ADMIN', N'OPERATOR')),
        CONSTRAINT CK_Orders_Integration CHECK (IntegrationStatus IN (N'PENDING', N'EXPORTED', N'FAILED', N'NOT_REQUIRED')),
        CONSTRAINT FK_Orders_CreatedUser FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Orders_UpdatedUser FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_Orders_DeliveryDate ON dbo.Orders(DeliveryDate, Status);
    CREATE INDEX IX_Orders_PersonnelDelivery ON dbo.Orders(LegacyPersonnelId, DeliveryDate);

    CREATE TABLE dbo.OrderLines (
        OrderLineId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        OrderId INT NOT NULL,
        UStokId INT NOT NULL,
        AStokId INT NOT NULL DEFAULT (0),
        Quantity INT NOT NULL,
        ProductCode NVARCHAR(50) NOT NULL,
        ProductName NVARCHAR(200) NOT NULL,
        VariantName NVARCHAR(200) NULL,
        CONSTRAINT UQ_OrderLines_Product UNIQUE (OrderId, UStokId, AStokId),
        CONSTRAINT CK_OrderLines_Ids CHECK (UStokId > 0 AND AStokId >= 0),
        CONSTRAINT CK_OrderLines_Quantity CHECK (Quantity > 0),
        CONSTRAINT FK_OrderLines_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE
    );

    CREATE TABLE dbo.OrderAudit (
        AuditId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        OrderId INT NOT NULL,
        Revision INT NOT NULL,
        ActionCode NVARCHAR(20) NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        ActorUserId INT NOT NULL,
        ActorRole NVARCHAR(20) NOT NULL,
        Reason NVARCHAR(300) NULL,
        OccurredAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        -- Denetim geçmişi siparişle birlikte sessizce silinmemelidir.
        CONSTRAINT FK_OrderAudit_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId),
        CONSTRAINT FK_OrderAudit_User FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_OrderAudit_OrderRevision ON dbo.OrderAudit(OrderId, Revision);

    CREATE TABLE dbo.OrderIdempotency (
        UserId INT NOT NULL,
        IdempotencyKey NVARCHAR(100) NOT NULL,
        RequestHash VARBINARY(32) NOT NULL,
        OrderId INT NOT NULL,
        CreatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT PK_OrderIdempotency PRIMARY KEY (UserId, IdempotencyKey),
        CONSTRAINT FK_OrderIdempotency_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_OrderIdempotency_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE
    );

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (3);
    COMMIT TRANSACTION;
END;
