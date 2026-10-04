-- SQL Server 2005. Run only while the IIS site and daily export task are stopped.
-- Take a verified EkmekSiparis backup first. Security/session clocks remain UTC.
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'EkmekSiparis'
BEGIN
    RAISERROR(N'Bu migration yalnızca EkmekSiparis veritabanında çalıştırılabilir.', 16, 1);
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 9)
BEGIN
    -- This release assumes the SQL host's local clock is Turkey time (UTC+03:00).
    -- GETDATE() is used for all subsequent order/audit writes.
    IF ABS(DATEDIFF(minute, GETUTCDATE(), GETDATE()) - 180) > 1
    BEGIN
        RAISERROR(N'SQL sunucusunun yerel saati UTC+03:00 değil; migration durduruldu.', 16, 1);
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 8)
       AND NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE VersionNumber = 9)
    BEGIN
        DECLARE @columns TABLE (TableName SYSNAME, OldName SYSNAME, NewName SYSNAME);
        INSERT INTO @columns VALUES (N'OrderSettings', N'UpdatedAtUtc', N'UpdatedAt');
        INSERT INTO @columns VALUES (N'OrderSettings', N'OverrideUntilUtc', N'OverrideUntil');
        INSERT INTO @columns VALUES (N'OrderWindowAudit', N'OccurredAtUtc', N'OccurredAt');
        INSERT INTO @columns VALUES (N'OrderWindowAudit', N'OverrideUntilUtc', N'OverrideUntil');
        INSERT INTO @columns VALUES (N'Orders', N'CreatedAtUtc', N'CreatedAt');
        INSERT INTO @columns VALUES (N'Orders', N'UpdatedAtUtc', N'UpdatedAt');
        INSERT INTO @columns VALUES (N'Orders', N'LastExportedAtUtc', N'LastExportedAt');
        INSERT INTO @columns VALUES (N'OrderAudit', N'OccurredAtUtc', N'OccurredAt');
        INSERT INTO @columns VALUES (N'OrderIdempotency', N'CreatedAtUtc', N'CreatedAt');
        INSERT INTO @columns VALUES (N'OrderFinalizations', N'StartedAtUtc', N'StartedAt');
        INSERT INTO @columns VALUES (N'OrderFinalizations', N'LastAttemptAtUtc', N'LastAttemptAt');
        INSERT INTO @columns VALUES (N'OrderFinalizations', N'FinalizedAtUtc', N'FinalizedAt');
        INSERT INTO @columns VALUES (N'CustomerManagementAudit', N'OccurredAtUtc', N'OccurredAt');
        INSERT INTO @columns VALUES (N'DriverManagementAudit', N'OccurredAtUtc', N'OccurredAt');

        IF EXISTS (SELECT 1 FROM @columns
                   WHERE COL_LENGTH(N'dbo.' + TableName, OldName) IS NULL
                      OR COL_LENGTH(N'dbo.' + TableName, NewName) IS NOT NULL)
        BEGIN
            RAISERROR(N'Beklenen UTC sütunları bulunamadı veya İstanbul sütunları zaten var; hiçbir kayıt değiştirilmedi.', 16, 1);
            RETURN;
        END;

        BEGIN TRANSACTION;
        DECLARE @table SYSNAME, @old SYSNAME, @new SYSNAME, @oldQualified NVARCHAR(300);
        DECLARE @default SYSNAME, @sql NVARCHAR(MAX);
        DECLARE timestamp_columns CURSOR LOCAL FAST_FORWARD FOR
            SELECT TableName, OldName, NewName FROM @columns;
        OPEN timestamp_columns;
        FETCH NEXT FROM timestamp_columns INTO @table, @old, @new;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SELECT @default = dc.name
            FROM sys.default_constraints dc
            INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id
                                      AND c.column_id = dc.parent_column_id
            WHERE dc.parent_object_id = OBJECT_ID(N'dbo.' + @table) AND c.name = @old;

            IF @default IS NOT NULL
            BEGIN
                SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@table) +
                           N' DROP CONSTRAINT ' + QUOTENAME(@default);
                EXEC sp_executesql @sql;
            END;

            SET @oldQualified = N'dbo.' + QUOTENAME(@table) + N'.' + QUOTENAME(@old);
            EXEC sp_rename @oldQualified, @new, N'COLUMN';
            SET @sql = N'UPDATE dbo.' + QUOTENAME(@table) + N' SET ' + QUOTENAME(@new) +
                       N' = DATEADD(hour, 3, ' + QUOTENAME(@new) + N') WHERE ' +
                       QUOTENAME(@new) + N' IS NOT NULL';
            EXEC sp_executesql @sql;

            IF @default IS NOT NULL
            BEGIN
                SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@table) +
                           N' ADD CONSTRAINT ' + QUOTENAME(N'DF_Yepas_' + @table + N'_' + @new) +
                           N' DEFAULT (GETDATE()) FOR ' + QUOTENAME(@new);
                EXEC sp_executesql @sql;
            END;
            SET @default = NULL;
            FETCH NEXT FROM timestamp_columns INTO @table, @old, @new;
        END;
        CLOSE timestamp_columns;
        DEALLOCATE timestamp_columns;
        INSERT INTO dbo.SchemaMigrations (VersionNumber) VALUES (9);
        COMMIT TRANSACTION;
    END
    ELSE
        RAISERROR(N'Önce 001-008 migrationları tamamlanmalıdır.', 16, 1);
END;
