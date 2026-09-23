# EkmekSiparis migration sırası

Bu betikler yalnızca yeni uygulama veritabanı içindir. `PrestoPlus` şemasına yazmazlar.

1. Hedef SQL instance ve yedeği doğrulayın.
2. `master` bağlamında `000_create_database.sql` çalıştırın.
3. `EkmekSiparis` bağlamında sırayla `001_identity.sql`, `002_session_role.sql`, `003_orders.sql`, `004_customer_management.sql`, `005_driver_management.sql`, `006_order_finalization.sql`, `007_order_sync_metadata.sql` çalıştırın.
4. `dbo.SchemaMigrations` tablosunda 1-7 sürümlerini ve dört rolü (`ADMIN`, `OPERATOR`, `CUSTOMER`, `DRIVER`) doğrulayın.
5. PrestoPlus DEV bağlamında `database/permissions` altındaki `003`, `004` ve `005` betiklerini çalıştırın. `005`, yalnız mobil sipariş fişlerini oluşturmak ve aynı fişi yeniden senkronize etmek için gereken dar yazma yetkilerini verir.

Migration betikleri aynı veritabanında yeniden çalıştırılabilir. SQL Server 2005'te gerçek uygulamadan önce ayrıca uyumluluk testi yapılacaktır; yerel SQL Server 2022 doğrulaması bunun yerine geçmez.

Migration betikleri kullanıcı veya parola oluşturmaz. Yerel geliştirme bilgisayarında ilk admin hesabı, PowerShell'de `..\New-LocalAdmin.ps1 -LoginName <ad>` komutuyla etkileşimli açılır; parola terminalde gizli istenir ve betiğe yazılmaz. Bu komut yalnızca yerel `.\YEPASDEV` içindir, canlı sunucuda kullanılmaz. Canlı kurulum için ayrı yetkili hesap açma akışı hazırlanmalıdır.
