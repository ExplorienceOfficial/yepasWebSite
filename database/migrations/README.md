# EkmekSiparis migration sırası

Bu betikler yalnızca yeni uygulama veritabanı içindir. `PrestoPlus` şemasına yazmazlar.

1. Hedef SQL instance ve yedeği doğrulayın.
2. `master` bağlamında `000_create_database.sql` çalıştırın.
3. `EkmekSiparis` bağlamında sırayla `001_identity.sql`, `002_session_role.sql` çalıştırın.
4. `dbo.SchemaMigrations` tablosunda 1 ve 2 sürümlerini ve dört rolü (`ADMIN`, `OPERATOR`, `CUSTOMER`, `DRIVER`) doğrulayın.

Migration betikleri aynı veritabanında yeniden çalıştırılabilir. SQL Server 2005'te gerçek uygulamadan önce ayrıca uyumluluk testi yapılacaktır; yerel SQL Server 2022 doğrulaması bunun yerine geçmez.

Migration betikleri kullanıcı veya parola oluşturmaz. Yerel geliştirme bilgisayarında ilk admin hesabı, PowerShell'de `..\New-LocalAdmin.ps1 -LoginName <ad>` komutuyla etkileşimli açılır; parola terminalde gizli istenir ve betiğe yazılmaz. Bu komut yalnızca yerel `.\YEPASDEV` içindir, canlı sunucuda kullanılmaz. Canlı kurulum için ayrı yetkili hesap açma akışı hazırlanmalıdır.
