-- SQL Server 2005 uyumlu ilk kimlik/oturum şeması.
-- 000_create_database.sql sonrasında EkmekSiparis veritabanı bağlamında çalıştırın.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchemaMigrations (
        VersionNumber INT NOT NULL PRIMARY KEY,
        AppliedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE())
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 1)
BEGIN
    CREATE TABLE dbo.Users (
        UserId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        LoginName NVARCHAR(100) NOT NULL,
        LoginNameNormalized NVARCHAR(100) NOT NULL,
        PasswordHash VARBINARY(32) NULL,
        PasswordSalt VARBINARY(32) NULL,
        PasswordIterations INT NULL,
        PasswordAlgorithm NVARCHAR(30) NULL,
        IsActive BIT NOT NULL DEFAULT (0),
        MustChangePassword BIT NOT NULL DEFAULT (1),
        TemporaryPasswordExpiresUtc DATETIME NULL,
        FailedLoginCount INT NOT NULL DEFAULT (0),
        LockoutUntilUtc DATETIME NULL,
        CreatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        UpdatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT UQ_Users_LoginNameNormalized UNIQUE (LoginNameNormalized),
        CONSTRAINT CK_Users_PasswordFields CHECK (
            (PasswordHash IS NULL AND PasswordSalt IS NULL AND PasswordIterations IS NULL AND PasswordAlgorithm IS NULL)
            OR
            (PasswordHash IS NOT NULL AND PasswordSalt IS NOT NULL AND PasswordIterations > 0 AND PasswordAlgorithm IS NOT NULL)
        )
    );

    CREATE TABLE dbo.Roles (
        RoleCode NVARCHAR(20) NOT NULL PRIMARY KEY,
        Description NVARCHAR(100) NOT NULL
    );

    INSERT INTO dbo.Roles (RoleCode, Description) VALUES (N'ADMIN', N'Yönetici');
    INSERT INTO dbo.Roles (RoleCode, Description) VALUES (N'OPERATOR', N'Operasyon');
    INSERT INTO dbo.Roles (RoleCode, Description) VALUES (N'CUSTOMER', N'Müşteri');
    INSERT INTO dbo.Roles (RoleCode, Description) VALUES (N'DRIVER', N'Şoför');

    CREATE TABLE dbo.UserRoles (
        UserId INT NOT NULL,
        RoleCode NVARCHAR(20) NOT NULL,
        CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleCode),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleCode) REFERENCES dbo.Roles(RoleCode)
    );

    CREATE TABLE dbo.DriverAccounts (
        UserId INT NOT NULL PRIMARY KEY,
        LegacyPersonnelId INT NOT NULL,
        CONSTRAINT UQ_DriverAccounts_LegacyPersonnelId UNIQUE (LegacyPersonnelId),
        CONSTRAINT FK_DriverAccounts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );

    CREATE TABLE dbo.CustomerAccess (
        UserId INT NOT NULL,
        LegacyMbId INT NOT NULL,
        CONSTRAINT PK_CustomerAccess PRIMARY KEY (UserId, LegacyMbId),
        CONSTRAINT FK_CustomerAccess_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );

    CREATE TABLE dbo.AuthSessions (
        SessionId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        TokenHash VARBINARY(32) NOT NULL,
        CreatedAtUtc DATETIME NOT NULL DEFAULT (GETUTCDATE()),
        ExpiresAtUtc DATETIME NOT NULL,
        RevokedAtUtc DATETIME NULL,
        CONSTRAINT UQ_AuthSessions_TokenHash UNIQUE (TokenHash),
        CONSTRAINT FK_AuthSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_AuthSessions_UserId ON dbo.AuthSessions(UserId);

    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (1);
END;

COMMIT TRANSACTION;
