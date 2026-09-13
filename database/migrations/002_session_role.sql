-- SQL Server 2005 uyumlu. Oturum, giriş sırasında seçilen role bağlanır.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 2)
BEGIN
    BEGIN TRANSACTION;
    ALTER TABLE dbo.AuthSessions
        ADD RoleCode NVARCHAR(20) NOT NULL DEFAULT (N'CUSTOMER');
    ALTER TABLE dbo.AuthSessions
        ADD CONSTRAINT FK_AuthSessions_Roles FOREIGN KEY (RoleCode) REFERENCES dbo.Roles(RoleCode);
    INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (2);
    COMMIT TRANSACTION;
END;
