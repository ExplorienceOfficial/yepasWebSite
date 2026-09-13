-- SQL Server 2005 uyumlu. Bu betik yalnızca yeni uygulama veritabanını oluşturur.
-- Mevcut PrestoPlus veritabanına dokunmaz.
IF DB_ID(N'EkmekSiparis') IS NULL
BEGIN
    CREATE DATABASE [EkmekSiparis];
END;
