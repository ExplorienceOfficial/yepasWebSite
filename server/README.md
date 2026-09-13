# Yerel kimlik doğrulama ve ürün kataloğu önizlemesi

Bu ilk dikey parça, `D00013.RS_URUNLER_UST`, `D00013.RS_URUNLER_ALT` ve `D00013.STOK` tablolarından salt-okunur ürün kodu, adı ve varyasyonları getirir. Sorgu `database/queries/admin_products.sql` içindedir. Fiyat okunmaz veya API'den dönmez.

## Çalıştırma

Geliştirme bilgisayarında `PrestoPlus_Local` ve migration sürümü 2 uygulanmış `EkmekSiparis` veritabanları `.\YEPASDEV` SQL instance'ında açık olmalıdır. İlk admin hesabını `database/New-LocalAdmin.ps1 -LoginName <ad>` ile etkileşimli açın. Parolayı sohbete veya repoya yazmayın. Sonra iki ayrı PowerShell penceresi kullanın:

```powershell
& 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\MSBuild\Current\Bin\MSBuild.exe' '.\server\Yepas.Api\Yepas.Api.csproj' /t:Build /p:Configuration=Debug
& 'C:\Program Files\IIS Express\iisexpress.exe' /path:'C:\Users\ASUS\OneDrive\Desktop\Projects\yepas\web\server\Yepas.Api' /port:5057 /systray:false
```

```powershell
npm run dev -- --hostname localhost
```

Tarayıcıda `http://localhost:3000` açılır. `127.0.0.1` yerine `localhost` kullanın; geliştirme oturum çerezi aynı site kapsamında kalmalıdır.

## Güvenlik ve kapsam

- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` oturum uçlarıdır.
- Ürün API'si `GET /api/v1/admin/products` yolundadır ve yalnızca geçerli `ADMIN` oturumu kabul eder.
- `POST /api/v1/admin/drivers/{personnelId}/login-access` yalnızca admin oturumuyla var olan şoför hesabının giriş iznini değiştirir. Kapatma, açık oturumları iptal eder. Arayüz kontrolü henüz bağlanmadı.
- Ürün ekranındaki düzenleme/silme ve sahte talep/limit işlemleri gizlenmiştir. Eski ürün tablolarına yazma yapılmaz.
- `Debug` yerel bağlantı kullanır. `Release` için `YEPAS_APP_CONNECTION` ve `YEPAS_CATALOG_CONNECTION` ayrıca yapılandırılmalıdır; gerçek şifreler dosyaya yazılmaz.
- Giriş artık demo hesapları kullanmaz. Diğer operasyon sayfaları ve şoförün müşteri/sipariş listesi henüz gerçek API'ye bağlanmadı.
- Bu henüz canlıya hazır bir güvenlik teslimi değildir: ilk admin/şoför hesap yönetimi, geçici parola değiştirme, IP bazlı hız sınırı, HTTPS/çerez kurulum testi, SQL Server 2005 uyumluluk testi ve statik frontend yayın paketi tamamlanmalıdır.
