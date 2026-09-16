# YEPAS 0.1.0 smoke kurulumu

Bu paket yalnızca Windows 7/IIS 7.5/SQL Server 2005 uyumluluk denemesi içindir. PROD'a kurulmaz ve mevcut `C:\RSiparis` klasörüne dokunmaz.

## Güvenli hedef

- Uygulama sunucusu: `192.168.5.230`
- Veritabanı: yalnızca DEV instance
- Önerilen klasör: `C:\YepasApp\releases\0.1.0-smoke`
- Ayrı IIS site ve uygulama havuzu
- Ayrı HTTPS binding

## Kurulum sırası

1. Windows 7 SP1, IIS 7.5 ASP.NET özellikleri ve .NET Framework 4.8'i doğrulayın.
2. Hedef klasörü ve yeni `EkmekSiparis` veritabanını yedekleyin.
3. Paketin SHA-256 listesini doğrulayın.
4. `database` betiklerini SSMS ile sırasıyla çalıştırın: `000`, `001`, `002`.
5. `site` içeriğini yeni sürüm klasörüne kopyalayın.
6. Ayrı, yönetici olmayan IIS uygulama havuzu ve site oluşturun. Uygulama havuzu `.NET v4.0`, Integrated pipeline ve 64-bit kullanmalıdır.
7. En az yetkili DEV SQL hesaplarını hazırlayın; `sa` kullanmayın.
8. Sunucuda yönetici PowerShell'i açıp `tools\Configure-Smoke.ps1 -SitePath <site klasörü>` çalıştırın. Bağlantı dizeleri ekranda görünmeden girilir ve `web.config` içinde şifrelenir.
9. İlk smoke adminini `tools\New-LocalAdmin.ps1 -LoginName <ad> -PromptConnectionString` ile oluşturun. Uygulama veritabanı bağlantı dizesi ve admin parolası ekranda görünmeden istenir; veritabanında yalnızca parola özeti tutulur.
10. Geçerli sertifikayla HTTPS binding ekleyin. Release girişi HTTP üzerinden bilerek reddedilir.
11. Siteyi başlatın ve aşağıdaki kontrolleri yapın.

## Smoke kontrolleri

- `/` giriş ekranını açar.
- Girişsiz `/api/v1/auth/me` isteği `401` döndürür.
- Admin girişi HTTPS üzerinde çalışır ve parola ağ/log çıktısında görünmez.
- `/admin/urunler/` gerçek DEV ürünlerini gösterir ve fiyat döndürmez.
- Girişsiz `/api/v1/admin/products` isteği `401` döndürür.
- IIS uygulama havuzu yeniden başlatıldıktan sonra yeniden giriş yapılabilir.
- Mevcut RSiparis uygulaması ve PROD veritabanı etkilenmez.

## Geri dönüş

Smoke sitesi ve ona ait uygulama havuzu durdurulur. Yalnızca bu sürüm için oluşturulan IIS site/binding kaldırılır. `C:\RSiparis` değiştirilmez. Yeni veritabanı otomatik silinmez; saklama veya kaldırma kararı yedek doğrulandıktan sonra ayrıca verilir.
