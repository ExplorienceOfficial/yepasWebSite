-- SQL Server 2005. No PIN is generated or changed by this migration.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Run only in EkmekSiparis.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=13)
BEGIN
    RAISERROR(N'Apply migration 013 first.',16,1);
    RETURN;
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber=14)
BEGIN
    BEGIN TRANSACTION;
    ALTER TABLE dbo.AuthSessions ALTER COLUMN ExpiresAtUtc DATETIME NULL;
    -- Never resurrect expired or revoked sessions.
    UPDATE dbo.AuthSessions SET ExpiresAtUtc=NULL
    WHERE RoleCode IN (N'ADMIN',N'DRIVER') AND RevokedAtUtc IS NULL
      AND ExpiresAtUtc>GETUTCDATE();
    UPDATE U SET TemporaryPasswordExpiresUtc=NULL,
        MustChangePassword=CASE WHEN EXISTS
            (SELECT 1 FROM dbo.UserRoles R WHERE R.UserId=U.UserId AND R.RoleCode=N'DRIVER')
            THEN 0 ELSE U.MustChangePassword END
    FROM dbo.Users U
    WHERE EXISTS (SELECT 1 FROM dbo.UserRoles R WHERE R.UserId=U.UserId AND R.RoleCode IN (N'CUSTOMER',N'DRIVER'))
      AND NOT EXISTS (SELECT 1 FROM dbo.UserRoles R WHERE R.UserId=U.UserId AND R.RoleCode NOT IN (N'CUSTOMER',N'DRIVER'));
    INSERT INTO dbo.SchemaMigrations(VersionNumber) VALUES(14);
    COMMIT TRANSACTION;
END;
