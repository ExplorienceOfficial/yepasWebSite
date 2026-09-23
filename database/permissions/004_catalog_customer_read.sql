-- Admin müşteri yönetimi için gereken ek salt-okunur legacy izinleri.
USE [PrestoPlus];
GRANT SELECT ON OBJECT::[D00013].[MUSTERILER] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[BF_MUST_BOLUM] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[BF_PERS_MUST] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[FIRMA_PERSONELI] TO [YepasCatalogReader];
