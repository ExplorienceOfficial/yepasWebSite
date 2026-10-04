-- Atomik gün eşitlemesi tek EkmekSiparis bağlantısından PrestoPlus'a erişir.
-- Bu yetkiler eski katalog bağlantısına değil, EkmekSiparis bağlantısının
-- SQL login'inin PrestoPlus içindeki kullanıcı eşlemesine verilmelidir.
-- Yetkili kullanıcı adını kurulumda doğrulayın; başka mobil uygulamalarla
-- paylaşılan bir login'e otomatik olarak geniş yetki vermeyin.
USE [PrestoPlus];
-- Örnek (doğrulanan uygulama veritabanı kullanıcısıyla değiştirin):
-- GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::[D00013].[RS_FIS_BILGILERI] TO [YepasAppWriter];
-- GRANT SELECT, INSERT, DELETE ON OBJECT::[D00013].[RS_FIS_SATIRLARI] TO [YepasAppWriter];
