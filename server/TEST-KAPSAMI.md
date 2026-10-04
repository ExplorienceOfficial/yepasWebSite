# Kritik akış test kapsamı

## 5 Ekim müşteri notları

- Kullanıcı adı: başta/sonda ve Unicode boşluklar reddedilir; geçerli ad kabul edilir.
- Etkin manuel açık/kapalı modda gösterim saati `00:00`; AUTO modunda gerçek saat korunur.
- Şoför teslim tarihi: SQL UTC saatinden İstanbul günü; bugün verilen yarın teslim,
  dün verilen bugün teslim, gece yarısı sınırı.
- Üst/alt stok gruplama: `node --test tests/productGroups.test.mjs`;
  standart + varyant satırları aynı üst stok altında kalır, farklı stoklar birleşmez,
  miktarlar ve kaynak veriler değişmez.
- Ayrı giriş sayfaları `/login/admin/`, `/login/sofor/`; ayrı API uçları rolü sunucuda sabitler.

Sunucu kabul testi: anahtarı kapat/aç; aynı ekran ve üst rozet yenilemeden değişmeli,
API hata verirse eski değer korunmalı. Ayrı girişlerde yanlış rol reddini, bayi zaten
bağlı / kullanıcı adı dolu çatışmalarını gerçek test DB'sinde doğrulayın.
Mobil `00:00` gösteriminin API alanı hazırdır; mobilci `displayCutoffTime` alanını kullanmalıdır.

## Otomatik ve veritabanından bağımsız

Saat sınırı: backend testleri değişken cutoff, kesim anının dahil olması,
gece yarısı, manuel süre bitişi ve 00:00 sınırını kapsar. Frontend
`tests/orderStatusTimer.test.mjs` SQL cevap zamanlarından gecikme hesabını,
tek callback, ayar değişiminde eski callback'in iptalini ve manuel modda
zamanlayıcı olmamasını test eder. Sunucuda AUTO modunda birkaç dakika
sonrasına ayarlayıp aynı sayfada bekleyerek anahtar/rozet kabul testi yapılmalıdır.

5 Ekim gün kapanışı: politika testleri kalıcı kapanış, İstanbul gece sınırı,
manuel aktarımın düzenlemeyi kilitlememesi ve ertesi teslim gününün açık kalmasını kapsar.
`powershell.exe -NoProfile -File tests\runPolicyTests.ps1` Framework kaynak testlerini çalıştırır.

`powershell.exe -NoProfile -File tests\dayClosure.integration.ps1` yerel SQL
Server üzerinde yalnız kendisinin oluşturduğu `Yepas_ClosureTest_<guid>`
veritabanında gerçek migration ve repository kodunu çalıştırır, sonra bu
geçici DB'yi kaldırır. Varsayılan katalog `PrestoPlus_Local` salt okunur
erişim doğrulaması içindir. Bu test boş sipariş günleri kullanır: manuel
aktarımı, otomatik kapanışı, tekrar görevini, admin/müşteri üç yazma
durumunun reddini, enjekte edilmiş SQL hatasında metadata/kapanış rollback'ini
ve aynı gün kilidinde bekleyen gerçek repository yazmasının kapanışı
görerek reddedilmesini doğrular. HTTP yetkilendirme, gerçek ürünlü fiş
aktarımı ve Windows görev zamanlayıcısını kapsamaz; bunlar sunucuda ayrıca denenir.

Ek PIN kontrolleri: frontend ve saf backend tam 4 ASCII rakamı doğrular;
başta sıfır, boşluk, harf, Unicode rakam ve uzunluk sınırları test edilir.
İzole SQL testi gerçek `AuthRepository.ChangePassword` ile DRIVER'ın 4
rakamı kabul ettiğini, ADMIN/CUSTOMER'ın kısa PIN'i reddettiğini ve kendi
12–128 karakter politikalarının korunduğunu doğrular.

`Yepas.PolicyTests` aşağıdaki saf iş kurallarını çalıştırır:

- 11 sipariş penceresi/SG, kesim saati ve manuel durum kontrolü.
- Ürün/varyant adından tüm pozitif paket adetleri: lı/li/lu/lü, kesme işareti,
  büyük/küçük harf, gramaj ve kelime sınırı, ondalık ifade, çelişen adetler,
  sıfır ve taşma kontrolü.
- Sipariş satırı kontrolü: tanımlı ürün/varyant, tekrar, müşteri limiti,
  sıfır miktar, paket katı, boş gönderim, iptal/ürün istemiyorum ve
  katalog gerektirmeyen durumlar; 6'lı ürünlerde doğru/yanlış katlar ve
  çelişen ürünün reddi.
- 4 manuel/00:01 otomatik aktarım hedef günü ve gece sınırı kontrolü.
- 5 gün eşitleme kuralı: ürünsüz/iptal kayıtların eski fiş olmaması,
  değişmeyen fişin tekrar yazılmaması ve eski satır sapmasının düzeltilmesi.
- 5 şoför kullanıcı adı üretimi kontrolü.
- 4 İstanbul/UTC dönüşümü ve JSON tarih gösterimi kontrolü.

2 Ekim 2026 yerel `PrestoPlus_Local` kataloğu salt-okunur tarandı: 110 üst ürün,
129 varyant; 185 üst ürün/varyant çiftinin 8'inde paket eki bulundu. Bir çift
çelişiyor: U_STOK_ID=1415 (`8 Lİ KANEPE (25GR*8=200GR)`) ve A_STOK_ID=332
(`2 Lİ BURGER KANEPE`). Bu çift siparişe kapatılır; veritabanına yazılmadı.
Yerel kopyada RS_MOBIL_SIPARIS_URUN_TANIMLARI yok; denetim müşterinin güncel
uzak ürün-atama tablosunu kapsamıyor.

Çalıştırma:

```powershell
& 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\MSBuild\Current\Bin\MSBuild.exe' '.\server\Yepas.PolicyTests\Yepas.PolicyTests.csproj' /t:Rebuild /p:Configuration=Release
& '.\server\Yepas.PolicyTests\bin\Release\Yepas.PolicyTests.exe'
```

Bu senaryolar yalnızca saf iş kurallarını test eder; bir siparişin veritabanına
yazıldığını veya eski fişe doğru aktarıldığını **kanıtlamaz**.

## SQL Server 2005 test VM'sinde entegrasyon

Müşteri, VM üzerindeki `EkmekSiparis` ve `PrestoPlus` veritabanlarının test amaçlı
olduğunu teyit etti. Testler yalnız önceden belirlenen sipariş/şube üzerinde
çalıştırılmalı; sorguların etkileyeceği diğer kayıtlar önce kontrol edilmelidir.

29 Eylül 2026 tarihinde `0.4.0` smoke sürümünde elle doğrulananlar:

- Admin `MB 1592` için `OrderId 8` oluşturdu; ara tabloda `PENDING`, eski fiş yoktu.
- İlk aktarım `1683564 / U-1` mobil fişini oluşturdu.
- Admin güncellemesi ve tekrar aktarım aynı fişi güncelledi; mükerrer fiş olmadı.
- `customer-flow-test.py`, müşteri girişi/şube yetkisi, idempotency tekrarı ve
  çakışması ile eski revizyon reddini doğruladı. Sonrasında aynı fişe tekrar
  aktarım başarılı oldu.
- 30 Eylül 00:01 otomatik görevini test etmek için `OrderId 8` miktarı 3 olarak
  `PENDING` bırakıldı; sonucun doğrulanması bekleniyor.

1 Ekim 2026 tarihinde `0.5.0` smoke sürümünde elle doğrulananlar:

- `OrderId 11`, 2 Ekim teslim için `PENDING` olarak oluştu ve ilk aktarımda
  `1683567 / U-1` mobil fişine 4 satır yazıldı.
- Yönetici “Ürün istemiyor” dediğinde aktif `Orders` satırı kalktı,
  `MobileReceiptRegistry.NeedsSync=1` kaldı. Sonraki aktarım yalnız `1683567`
  fişini ve sahiplik kaydını sildi; her ikisi de sıfırlandı.
- Aynı şubenin yeni `OrderId 12` siparişi yeniden aktarıldı ve yeni `1683568`
  fişine 1 satır yazıldı. Silinen `U-1` numarasının yeniden kullanılması
  müşteri tarafından kabul edildi.
- 00:01 zamanlanmış görevinin yeni sürümde fiilen çalıştığı henüz doğrulanmadı.

Kontrol paneli ve aktarım bildirimi değişiklikleri için ayrıca doğrulanacaklar:

- SQL sunucu saati ile uygulama sunucusu saati farklılaştırıldığında panelin
  günü SQL `GETDATE()` üzerinden belirlemesi.
- Geçmiş Eylül `PENDING` kayıtlarının bugün/yarın bildirimi üretmemesi;
  bugün/yarın güncellemesinin en geç 15 saniyede uyarı üretmesi.
- %100 tarayıcı ölçeğinde sipariş düzenleme modalının alt kaydet düğmesine
  erişilebilmesi; modaldaki uzun ürün listesinin kaydırılabilmesi.

Henüz otomatik entegrasyon testine dönüşmeyen senaryolar:

1. Müşteri PUT: ilk sipariş `Orders` + `OrderLines` + `OrderAudit` oluşturur;
   aynı `Idempotency-Key` tekrarında ikinci kayıt açılmaz, farklı gövdede hata.
2. Aynı şubede yeni revizyon satırları değiştirir; eski revizyon reddedilir;
   başka şube ve gün değişmez.
3. Kesim saati ve manuel kapalıyken müşteri yazamaz; admin yetkisi, müşteri
   şube yetkisi ve şoför kapsamı sunucuda uygulanır.
4. İlk manuel aktarım yalnız yarın teslimli bekleyen mobil siparişleri
   `RS_FIS_BILGILERI` ve `RS_FIS_SATIRLARI` tablolarına yazar.
5. Aktarılmış sipariş güncellenip tekrar aktarıldığında aynı mobil fiş ID'si
   korunur, yalnız o fişin satırları yenilenir; eski programın MOBIL olmayan
   fişleri ve diğer müşterilerin fişleri değişmez.
6. İptal/ürün istemiyorum sonrası tekrar aktarım, sadece ilişkili mobil fişi
   doğru biçimde temizler; tekrar çağrı mükerrer fiş açmaz.
7. Salı 00:01 görevi Pazartesi oluşturulup Salı teslim edilen bekleyenleri
   aktarır; ikinci çalıştırma mükerrerlik yaratmaz; dünün fişleri değişmez.
8. İki veritabanından biri kullanılamazsa hata kaydı ve yeniden deneme
   davranışı doğrulanır; kısmi aktarım sonrasında güvenli toparlanma denenir.
9. Ayrı bir test veritabanında `DriverAccounts` erişilemez/eksik olduğunda
   ADMIN ve CUSTOMER girişleri ile mevcut oturumlarının `/auth/me` doğrulaması
   çalışmaya devam eder. DRIVER girişi ve oturumu ise güvenli biçimde reddedilir
   veya yalnız şoför tarafında hizmet hatası verir. Paylaşılan VM veritabanında
   gerçek tabloyu bozarak bu senaryo denenmez.
10. Ürün tanımları okunamadığında `NO_PRODUCT` ve `CANCELLED` yazılabilir;
    `SUBMITTED` ise tanımsız ürün kabul etmeden güvenli biçimde reddedilir.
11. Uygulama sipariş tablosu okunamadığında şoför rotası durakları
    `ordersAvailable=false` ve uyarıyla döner; hiçbir durak “sipariş yok”
    diye işaretlenmez. Aktarım durumu sorgusu bozulursa admin uyarısı
    “bekleyen yok” demez, durumun bilinmediğini gösterir.
12. 010 migration sonrası bir şubede sipariş kaldırıldığında yalnız onun kayıtlı
    mobil fişi silinir; farklı fiş ID'leri ve başka tarih değişmez. Ortadaki
    bir SQL hatasında iki veritabanındaki tüm gün değişiklikleri geri alınır.
13. Ara veritabanı erişilemediğinde sıfır sipariş varsayılmaz ve eski fişler
    silinmez. Veritabanları farklı instance'daysa işlem başlamaz. Uygulama
    hesabının eski veritabanına yazma yetkisi yoksa transaction geri alınır.

Yukarıdaki elle doğrulamalar değerli olsa da bu maddeler otomatik çalışır ve
tekrarlanabilir hale gelmeden tam otomatik uçtan uca kapsam var denmemelidir.
