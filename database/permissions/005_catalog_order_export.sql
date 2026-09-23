-- Yalnızca mobil siparişleri oluşturmak ve aynı mobil fişi yeniden senkronize etmek için gereken yetkiler.
USE [PrestoPlus];
GRANT SELECT, INSERT, UPDATE ON OBJECT::[D00013].[RS_FIS_BILGILERI] TO [YepasCatalogReader];
GRANT SELECT, INSERT, DELETE ON OBJECT::[D00013].[RS_FIS_SATIRLARI] TO [YepasCatalogReader];
