# EkmekSiparis migration sırası

Bu betikler yalnızca yeni uygulama veritabanı içindir. `PrestoPlus` şemasına yazmazlar.

1. Hedef SQL instance ve yedeği doğrulayın.
2. `master` bağlamında `000_create_database.sql` çalıştırın.
3. `EkmekSiparis` bağlamında sırayla `001_identity.sql`, `002_session_role.sql`, `003_orders.sql`, `004_customer_management.sql`, `005_driver_management.sql`, `006_order_finalization.sql`, `007_order_sync_metadata.sql`, `008_automatic_order_export.sql`, `009_istanbul_order_timestamps.sql`, `010_mobile_receipt_registry.sql` çalıştırın.
4. `011_delivery_day_closure.sql` çalıştırın. `dbo.SchemaMigrations` tablosunda 1-11 sürümlerini ve dört rolü (`ADMIN`, `OPERATOR`, `CUSTOMER`, `DRIVER`) doğrulayın.
5. PrestoPlus DEV bağlamında `database/permissions` altındaki `003`, `004` ve `005` betiklerini çalıştırın. 010 ile çalışan atomik eşitleme ayrıca **EkmekSiparis bağlantısının kullandığı login'in** PrestoPlus içinde doğrulanmış kullanıcı eşlemesini ve mobil fiş tablolarında gereken dar izinleri ister; `006_catalog_atomic_sync.sql` açıklamasına bakın. Bu login bilinmeden izin betiği otomatik çalıştırılmaz.

Migration betikleri aynı veritabanında yeniden çalıştırılabilir. SQL Server 2005'te gerçek uygulamadan önce ayrıca uyumluluk testi yapılacaktır; yerel SQL Server 2022 doğrulaması bunun yerine geçmez.

## 009 saat değişimi (mevcut kurulum)

Bu bir **kırıcı şema değişikliğidir**. IIS sitesini ve `Yepas Daily Export` görevini durdurun; `EkmekSiparis` için doğrulanmış yedek alın. Ardından yalnız uygulama veritabanında 009'u çalıştırın, `SchemaMigrations` sürüm 9'u ve `Orders.UpdatedAt` gibi yeni sütunları doğrulayın. 009, eski **test** sipariş/işlem saatlerini bir kez 3 saat ileri alır; sütunları `CreatedAt`, `UpdatedAt`, `LastExportedAt` vb. olarak yeniden adlandırır. Yeni kayıtların saati SQL Server'ın `GETDATE()` fonksiyonundan gelir. Bu alanların sözleşmesi şudur: **`EkmekSiparis` içindeki sipariş/işlem `...At` ve `OverrideUntil` alanları SQL sunucusunun Türkiye yerel saatidir**; UTC ya da kullanıcının bilgisayar saati değildir. `Users`, `AuthSessions` ve `SchemaMigrations` içindeki `...Utc` alanları ise UTC kalır. SQL Server 2005'te saat dilimi türü bulunmadığı için yerel saatler `DATETIME` içinde ofset bilgisi olmadan saklanır. SQL ve API sunucularında Türkiye saat dilimi doğru yapılandırılmalı ve güncel tutulmalıdır.

009 tamamlanmadan yeni API'yi başlatmayın; yeni API başlamadan eski API'yi tekrar açmayın. 009 ile yeni API **birlikte** devreye alınır. Hata halinde eski API'yi yeni şemaya bağlamayın; önce doğrulanmış yedekten geri dönün. Mobil API'nin `...Utc` alanları değişmez: API, veritabanındaki İstanbul saatini UTC'ye geri çevirip `Z` işaretiyle gönderir. Teslim günü gibi tarih-only değerler dönüştürülmez. Oturum ve şifre güvenliği tarihleri UTC kalır.

Migration betikleri kullanıcı veya parola oluşturmaz. Yerel geliştirme bilgisayarında ilk admin hesabı, PowerShell'de `..\New-LocalAdmin.ps1 -LoginName <ad>` komutuyla etkileşimli açılır; parola terminalde gizli istenir ve betiğe yazılmaz. Bu komut yalnızca yerel `.\YEPASDEV` içindir, canlı sunucuda kullanılmaz. Canlı kurulum için ayrı yetkili hesap açma akışı hazırlanmalıdır.
