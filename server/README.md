# YEPAS API geliştirme notları

Bu ilk dikey parça, `D00013.RS_URUNLER_UST`, `D00013.RS_URUNLER_ALT` ve `D00013.STOK` tablolarından salt-okunur ürün kodu, adı ve varyasyonları getirir. Sorgu `database/queries/admin_products.sql` içindedir. Fiyat okunmaz veya API'den dönmez.

## Çalıştırma

Geliştirme bilgisayarında `PrestoPlus_Local` ve migration sürümü 5 uygulanmış `EkmekSiparis` veritabanları `.\YEPASDEV` SQL instance'ında açık olmalıdır. İlk admin hesabını `database/New-LocalAdmin.ps1 -LoginName <ad>` ile etkileşimli açın. Parolayı sohbete veya repoya yazmayın. Sonra iki ayrı PowerShell penceresi kullanın:

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
- `GET /api/v1/admin/drivers` eski programdaki rota personellerini ve uygulama hesaplarını listeler. Hesap açma, kapatma/açma ve geçici parola yenileme uçları yalnız admin oturumuyla çalışır; kapatma açık oturumları iptal eder.
- `GET /api/v1/driver/routes?scope=delivery|submitted` giriş yapan şoförün yalnız kendi personel kimliğine bağlı şubelerini ve seçilen kapsamdaki siparişleri getirir. Şoför ekranı bu gerçek uçtan beslenir.
- `GET /api/v1/customer/branches/{legacyMbId}/order` müşteriye tanımlı ürünleri, yalnızca `SG_1`–`SG_7` alanlarından hesaplanan sıradaki teslim gününü, sipariş penceresini ve varsa mevcut siparişi getirir.
- `PUT /api/v1/customer/branches/{legacyMbId}/order` sipariş oluşturur, günceller, iptal eder veya `NO_PRODUCT` kaydı oluşturur. `Idempotency-Key` başlığı zorunludur; güncellemede en son `revision` gönderilir.
- `GET/PUT /api/v1/admin/order-settings` genel kesim saatini ve `AUTO`, `OPEN`, `CLOSED` manuel durumunu yönetir. Manuel değişikliklerde gerekçe zorunludur ve denetim kaydı tutulur.
- `GET /api/v1/admin/customers` eski programdaki müşteri/şube, SG ve şoför bilgisini hesap durumuyla birlikte getirir. Müşteri ürün tablosu gelene kadar ürün atama durumu “bekleniyor” olarak gösterilir.
- `POST /api/v1/admin/customers/accounts` aynı müşteriye ait bir veya daha fazla `MB_ID` şubesi için tek mobil hesap açar. Geçici parola yedi gün geçerlidir ve ilk girişte değiştirilir.
- `PUT /api/v1/admin/customers/accounts/{userId}/branches`, `status` ve `reset-password` uçları şube bağlantısı, giriş izni ve geçici parola yönetimini denetim kaydıyla yapar.
- `POST /api/v1/auth/change-password` geçici parolayı değiştirir; diğer açık oturumları iptal eder.
- Bir müşteri hesabı `CustomerAccess` ile birden fazla `MB_ID` şubesine bağlanabilir; her şubenin siparişi ayrıdır. Her `MB_ID` yalnızca bir mobil hesaba bağlanır.
- Müşteri ürün yetkisi için müşteri tarafından `RS_SABIT_SIPARISLER` benzeri yeni bir tablo hazırlanacaktır. `BF_MUST_STOK` nihai ürün yetki kaynağı değildir; yeni tablo gelene kadar mobil ürün entegrasyonu beklemededir.
- Fiyat hiçbir sipariş tablosunda tutulmaz ve API'den dönmez.
- Tatil veya müşteriye özel tarih istisnası bu sürümde yoktur. Teslim günü sadece eski sistemdeki `RS_MUSTERI_BILGILERI.SG_1`–`SG_7` işaretlerine göre hesaplanır.
- Ürün ekranındaki düzenleme/silme ve sahte talep/limit işlemleri gizlenmiştir. Eski ürün tablolarına yazma yapılmaz.
- `Debug` yerel bağlantı kullanır. `Release` için `YEPAS_APP_CONNECTION` ve `YEPAS_CATALOG_CONNECTION` ayrıca yapılandırılmalıdır; gerçek şifreler dosyaya yazılmaz.
- Giriş artık demo hesapları kullanmaz. Admin müşteri ekranında hesap açma, aynı müşterinin şubelerini bağlama, hesabı açıp kapatma ve geçici parola yenileme işlemleri gerçek API'ye bağlıdır.
- Sipariş çekirdeği, müşteri hesap yönetimi, şoför hesap yönetimi ve salt-okunur şoför rota ekranı hazırdır; mobil sipariş arayüzü, admin sipariş ekranı, iki günlük saklama görevi ve eski programa aktarım henüz tamamlanmamıştır.

## Dağıtım günü politika testi

```powershell
& 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\MSBuild\Current\Bin\MSBuild.exe' '.\server\Yepas.PolicyTests\Yepas.PolicyTests.csproj' /t:Rebuild /p:Configuration=Release
& '.\server\Yepas.PolicyTests\bin\Release\Yepas.PolicyTests.exe'
```

Test; kesim öncesi, kesim sonrası, manuel açık, manuel kapalı ve süresi dolmuş manuel durum senaryolarını doğrular.
