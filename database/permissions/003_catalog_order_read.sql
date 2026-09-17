-- PrestoPlus üzerinde sipariş günü ve müşteriye tanımlı mobil ürünleri okumak için gereken izinler.
-- Uygulama hesabına yazma yetkisi vermez.
USE [PrestoPlus];
GRANT SELECT ON OBJECT::[D00013].[RS_MUSTERI_BILGILERI] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[RS_MOBIL_SIPARIS_URUN_TANIMLARI] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[RS_URUNLER_UST] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[RS_URUNLER_ALT] TO [YepasCatalogReader];
GRANT SELECT ON OBJECT::[D00013].[STOK] TO [YepasCatalogReader];
