# YEPAS smoke kurulumu

Bu paket yalnızca Windows 7/IIS 7.5/SQL Server 2005 uyumluluk denemesi içindir. PROD'a kurulmaz ve mevcut `C:\RSiparis` klasörüne dokunmaz.

## Güvenli hedef

- Uygulama sunucusu: `192.168.5.230`
- Veritabanı: yalnızca DEV instance
- Önerilen klasör: `C:\YepasApp\releases\<sürüm>-smoke-<commit>`
- Ayrı IIS site ve uygulama havuzu
- Ayrı HTTPS binding

## Kurulum sırası

1. Windows 7 SP1, IIS 7.5 ASP.NET özellikleri ve .NET Framework 4.8'i doğrulayın.
2. Hedef klasörü ve yeni `EkmekSiparis` veritabanını yedekleyin.
3. Paketin SHA-256 listesini doğrulayın.
4. `database\migrations` betiklerini `EkmekSiparis` üzerinde sırasıyla çalıştırın: `000`, `001`, `002`, `003`, `004`, `005`, `006`.
5. `database\permissions` altındaki `003`, `004` ve `005` betiklerini `PrestoPlus` üzerinde çalıştırın. `005`, yalnız nihai sipariş aktarımı için gereken iki fiş tablosuna dar yazma yetkisi verir.
6. `site` içeriğini yeni sürüm klasörüne kopyalayın.
7. Ayrı, yönetici olmayan IIS uygulama havuzu ve site oluşturun. Uygulama havuzu `.NET v4.0`, Integrated pipeline ve 64-bit kullanmalıdır.
8. En az yetkili DEV SQL hesaplarını hazırlayın; `sa` kullanmayın.
9. Sunucuda yönetici PowerShell'i açıp `tools\Configure-Smoke.ps1 -SitePath <site klasörü>` çalıştırın. Bağlantı dizeleri ekranda görünmeden girilir ve `web.config` içinde şifrelenir.
10. İlk smoke adminini `tools\Yepas.AdminTool.exe --site-path <site klasörü> --login-name <ad>` ile oluşturun. Araç şifrelenmiş `YepasApp` bağlantısını site yapılandırmasından okur; admin parolası ekranda görünmeden istenir ve veritabanında yalnızca parola özeti tutulur.
11. Geçerli sertifikayla HTTPS binding ekleyin. Windows 7 Schannel ile güncel tarayıcılar arasında ortak şifre takımı sağlamak için ECDSA P-256 sertifika veya modern TLS sonlandıran bir reverse proxy kullanın. Release girişi HTTP üzerinden bilerek reddedilir.
12. PFX dosyasını IIS'e aktardıktan ve HTTPS'i doğruladıktan sonra sunucudaki aktarım kopyasını kaldırın; PFX özel anahtar içerir.
13. Siteyi başlatın ve aşağıdaki kontrolleri yapın.

## Smoke kontrolleri

- `/` giriş ekranını açar.
- Girişsiz `/api/v1/auth/me` isteği `401` döndürür.
- Admin girişi HTTPS üzerinde çalışır ve parola ağ/log çıktısında görünmez.
- `/admin/urunler/` gerçek DEV ürünlerini gösterir ve fiyat döndürmez.
- `/admin/musteriler/` şube bazındaki gerçek mobil ürün tanımı sayısını gösterir.
- Müşteri girişinden sonra `/api/v1/customer/branches/{legacyMbId}/order` yalnızca o
  şubeye `RS_MOBIL_SIPARIS_URUN_TANIMLARI` tablosunda tanımlanan ürünleri ve
  `U_STOK_LIMIT` değerlerini döndürür.
- Limit üzerindeki veya şubeye tanımlanmamış ürün içeren sipariş reddedilir.
- `/admin/sofor-yonetimi/` `BF_PERS_MUST` üzerinden müşteri/şubesi ve
  `RS_MUSTERI_BILGILERI` üzerinden SG takvimi bulunan personeli gösterir;
  şoför ekleme veya rota atama işlemi sunmaz.
- Şoför hesabı açma, kapatma ve geçici parola yenileme işlemleri çalışır; kapatılan hesabın açık oturumları iptal edilir.
- Şoför girişiyle `/sofor/` yalnız oturumdaki personelin eski sistemde bağlı şubelerini ve uygulamadaki siparişlerini gösterir.
- Sipariş alımı açıkken nihai hale getirme isteği reddedilir. Alım kapatıldıktan sonra yönetici onayı siparişleri kilitler ve yalnız `SUBMITTED` kayıtları eski `RS_FIS_BILGILERI` / `RS_FIS_SATIRLARI` tablolarına `MOBIL` kullanıcısı ve günlük `U-*` fiş numarasıyla aktarır.
- Nihai hale getirilen teslim gününde müşteri ve yönetici sipariş değişikliği reddedilir. Yarım kalan aktarım tekrar denendiğinde aynı eski fiş güncellenir; ikinci fiş oluşmaz.
- Girişsiz `/api/v1/admin/products` isteği `401` döndürür.
- IIS uygulama havuzu yeniden başlatıldıktan sonra yeniden giriş yapılabilir.
- Mevcut RSiparis uygulaması ve PROD veritabanı etkilenmez.

## Geri dönüş

Smoke sitesi ve ona ait uygulama havuzu durdurulur. Yalnızca bu sürüm için oluşturulan IIS site/binding kaldırılır. `C:\RSiparis` değiştirilmez. Yeni veritabanı otomatik silinmez; saklama veya kaldırma kararı yedek doğrulandıktan sonra ayrıca verilir.
