-- PrestoPlus DEV üzerinde YepasCatalogReader hesabına sipariş günü hesabı için gereken ek salt-okunur izin.
-- Uygulama hesabına yazma yetkisi vermez.
USE [PrestoPlus];
GRANT SELECT ON OBJECT::[D00013].[RS_MUSTERI_BILGILERI] TO [YepasCatalogReader];
