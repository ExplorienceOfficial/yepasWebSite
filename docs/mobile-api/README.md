# YEPAS Mobil API sözleşmesi

Bu belge mobil uygulama geliştiricisinin kullanacağı kesin `v1` sözleşmesini açıklar.
Yönetici uçları bu paketin kapsamında değildir. Makine tarafından okunabilir sözleşme
aynı klasördeki `openapi.yaml` dosyasındadır.

## Ortamlar

| Ortam | API kökü | Not |
|---|---|---|
| DEV/VPN | `https://192.168.5.230:8443/api/v1` | Yalnız fabrika ağı veya VPN üzerinden erişilir. Geliştirme sertifikası cihazda güvenilir olmalıdır. |
| PROD | Henüz atanmadı | Alan adı ve güvenli dış erişim hazırlandıktan sonra ayrıca bildirilecektir. |

Mobil uygulama API kökünü derleme ortamına göre yapılandırmalı; kaynak kodda sabit IP
tutmamalıdır. Parola, bearer token veya bağlantı bilgileri loglanmamalıdır.

## Ortak başlıklar

Mobil istemci bütün `POST` ve `PUT` çağrılarında şu başlığı göndermelidir:

```http
X-Yepas-Client: mobile-v1
```

Giriş dışındaki kimlik doğrulamalı çağrılarda:

```http
Authorization: Bearer <accessToken>
```

Sipariş kaydında ayrıca her kullanıcı işlemi için yeni ve benzersiz bir anahtar gerekir:

```http
Idempotency-Key: <UUID>
```

Aynı istek ağ hatası nedeniyle tekrarlanırsa aynı anahtar ve aynı gövde kullanılmalıdır.
Aynı anahtar farklı gövdeyle kullanılırsa `409 IDEMPOTENCY_CONFLICT` döner.

## 0. Sistem durumu (giriş öncesi)

`GET /system/status` — oturum gerektirmez, kişisel veri döndürmez.

```json
{
  "isOpen": false,
  "cutoffTime": "18:00",
  "cutoffMinute": 1080,
  "serverNowUtc": "2026-09-29T12:40:11Z"
}
```

Giriş ekranı bu ucu açılışta okur. `isOpen` `false` ise **"Giriş yap" düğmesi
gösterilmez**, yerine "Sistem kapalı" yazılır. Uç okunamazsa (ağ/sunucu hatası)
durum "bilinmiyor" sayılır ve giriş ekranı normal şekilde açık kalır — kapalı
olduğu varsayılmaz.

`cutoffTime`, "yarın teslim edilecek sipariş için kalan süre" yazısının
hesaplandığı saattir.

## 1. Giriş

`POST /auth/login`

```json
{
  "loginName": "musteri-kullanici-adi",
  "password": "gizli-parola",
  "role": "CUSTOMER"
}
```

`role` değeri müşteri için `CUSTOMER`, şoför için `DRIVER` olmalıdır.

Başarılı `200` yanıtı:

```json
{
  "userId": 12,
  "loginName": "musteri-kullanici-adi",
  "role": "CUSTOMER",
  "legacyPersonnelId": null,
  "mustChangePassword": false,
  "accessToken": "..."
}
```

Token sekiz saat geçerlidir. Güvenli cihaz deposunda saklanmalı ve uygulama loglarına
yazılmamalıdır. Beş başarısız girişten sonra hesap 15 dakika kilitlenir.

`mustChangePassword=true` ise yalnız parola değiştirme ekranı gösterilmelidir. Diğer
operasyon uçları geçici parola değiştirilene kadar `403` döndürür.

## 2. Oturum işlemleri

### Oturumu doğrulama

`GET /auth/me`

Giriş yanıtındaki kullanıcı kimliğini döndürür. `401`, tokenın geçersiz, iptal edilmiş
veya süresi dolmuş olduğunu belirtir.

### Parola değiştirme

`POST /auth/change-password`

```json
{
  "currentPassword": "mevcut-parola",
  "newPassword": "en-az-12-karakter-yeni-parola"
}
```

Yeni parola 12-128 karakter olmalı ve mevcut paroladan farklı olmalıdır. Başarı yanıtı
`204 No Content` olur. Mevcut oturum korunur; kullanıcının diğer açık oturumları iptal
edilir.

### Çıkış

`POST /auth/logout`

Başarı yanıtı `204 No Content` olur ve kullanılan token iptal edilir.

## 3. Müşteri akışı

### Yetkili şubeler

`GET /customer/branches`

Bir kullanıcıya birden fazla şube bağlanabilir. Sipariş ekranı her şubeyi ayrı göstermeli
ve sonraki isteklerde `legacyMbId` kullanmalıdır.

```json
[
  {
    "legacyMbId": 1592,
    "legacyCustomerId": 2619,
    "legacyDepartmentId": 1861,
    "legacyPersonnelId": 40,
    "customerCode": "B.0001",
    "customerName": "ÖRNEK MÜŞTERİ",
    "departmentName": "ÖRNEK ŞUBE",
    "taxNumber": "",
    "personnelName": "ÖRNEK PERSONEL",
    "distributionDays": "Pzt, Çar, Cum"
  }
]
```

### Sipariş bağlamı ve ürünler

`GET /customer/branches/{legacyMbId}/order`

Yanıt; sunucunun hesapladığı teslim gününü, sipariş penceresini, müşteriye eski
sistemde tanımlanmış ürünleri ve varsa mevcut siparişi birlikte döndürür.

```json
{
  "legacyMbId": 1592,
  "deliveryDate": "2026-09-19T00:00:00",
  "window": {
    "isOpen": true,
    "mode": "AUTO",
    "cutoffMinute": 1080,
    "deadlineUtc": "2026-09-18T15:00:00Z",
    "overrideUntilUtc": null
  },
  "products": [
    {
      "uStokId": 75,
      "aStokId": 0,
      "code": "013.002",
      "name": "100 GR DÖNER EKMEK",
      "groupId": 0,
      "variantName": null,
      "maxQuantity": 100,
      "packageSize": 1
    }
  ],
  "order": null
}
```

Kurallar:

- Teslim tarihi istemci tarafından gönderilmez; SG dağıtım günlerine göre sunucu hesaplar.
- AUTO modunda sipariş yalnız ilgili SG teslimatından önceki gün, son sipariş saatine kadar verilebilir.
- Son sipariş saati geçince sistem sonraki SG tarihine atlayarak açık kalmaz.
- Yalnız `products` dizisindeki `uStokId + aStokId` ikilileri sipariş edilebilir.
- `maxQuantity > 0` ise miktar bu sınırı aşamaz.
- `packageSize` ürün adından türetilir ve 5'li paket ürünlerde `5` döner. Miktar
  bu değerin katı olmalıdır; aksi hâlde API `400 INVALID_ORDER` döndürür. Mobil
  arayüz adet sayacını `packageSize` kadar artırıp azaltmalı ve elle girilen
  değeri en yakın kata yuvarlamalıdır (3 adet girilemez).
- Ürün adları kısaltılmadan gösterilmelidir; gerekirse alt satıra sarılır.
- Fiyat alanı yoktur ve mobil uygulama fiyat göstermemelidir.
- `window.isOpen=false` iken kayıt yapılmamalıdır.

### Sipariş oluşturma

`PUT /customer/branches/{legacyMbId}/order`

```json
{
  "revision": 0,
  "status": "SUBMITTED",
  "note": "İsteğe bağlı not",
  "lines": [
    { "uStokId": 75, "aStokId": 0, "quantity": 10 }
  ]
}
```

Yeni siparişte `revision` için `0` veya `null` kullanılabilir. Başarılı yanıt güncel
siparişi ve `revision=1` değerini döndürür.

### Sipariş güncelleme

Önce son sipariş yeniden okunmalı, ardından yanıttaki tam `revision` gönderilmelidir:

```json
{
  "revision": 1,
  "status": "SUBMITTED",
  "note": null,
  "lines": [
    { "uStokId": 75, "aStokId": 0, "quantity": 12 }
  ]
}
```

Başarılı güncellemede revision bir artar. `409 ORDER_REVISION_CONFLICT` alınırsa istemci
son halini tekrar okumalı; kullanıcının eski verisini otomatik olarak üzerine yazmamalıdır.

### Ürün istemiyorum

```json
{
  "revision": 0,
  "status": "NO_PRODUCT",
  "note": null,
  "lines": []
}
```

Mevcut sipariş üzerinde kullanılırsa güncel revision gönderilir. `NO_PRODUCT` ve
`CANCELLED` durumlarında `lines` mutlaka boş olmalıdır.

### İptal

```json
{
  "revision": 2,
  "status": "CANCELLED",
  "note": "İptal açıklaması",
  "lines": []
}
```

Sipariş penceresi kapandıktan veya admin teslim gününü nihai hale getirdikten sonra
müşteri değişiklik yapamaz. Finalize edilen kayıtlar eski sisteme yalnız bir kez aktarılır.

## 4. Şoför akışı

`GET /driver/routes?scope=delivery`

- `delivery`: bugün dağıtılacak şubeler ve siparişler.
- `submitted`: bugün verilen, bir sonraki dağıtım gününe ait siparişler.

```json
{
  "legacyPersonnelId": 40,
  "personnelCode": "40",
  "personnelName": "ÖRNEK ŞOFÖR",
  "scope": "delivery",
  "localDate": "2026-09-19T00:00:00",
  "deliveryDate": "2026-09-19T00:00:00",
  "generatedAtUtc": "2026-09-18T21:00:00Z",
  "stops": [
    {
      "legacyMbId": 1592,
      "legacyCustomerId": 2619,
      "legacyDepartmentId": 1861,
      "customerCode": "B.0001",
      "customerName": "ÖRNEK MÜŞTERİ",
      "departmentName": "ÖRNEK ŞUBE",
      "order": null
    }
  ]
}
```

Şoför yalnız eski sistemde `BF_PERS_MUST` ile kendisine bağlı ve SG dağıtım günü uygun
şubeleri görür. Mobil uygulama şoföre müşteri atama özelliği sunmaz.

## 5. Sipariş durumları

| Değer | Anlamı |
|---|---|
| `SUBMITTED` | En az bir ürün satırı bulunan aktif sipariş |
| `NO_PRODUCT` | Müşteri ilgili teslimat için ürün istemiyor |
| `CANCELLED` | Daha önceki yanıt/sipariş iptal edildi |

## 6. Temel hata kodları

| HTTP | Kod | Mobil davranış |
|---|---|---|
| 400 | `INVALID_ORDER` | Sunucu mesajını kullanıcıya göster; gövdeyi düzelt. |
| 400 | `IDEMPOTENCY_REQUIRED` | Yeni işlem için UUID üret. |
| 400 | `PASSWORD_CHANGE_REJECTED` | Parola ekranında sunucu mesajını göster. |
| 401 | `INVALID_LOGIN` | Kullanıcı adı/parolayı yeniden iste. |
| 401 | kod olmayabilir | Tokenı sil ve giriş ekranına dön. |
| 403 | `PASSWORD_CHANGE_REQUIRED` veya kod olmayabilir | Parola değiştirme ekranına yönlendir ya da yetki hatası göster. |
| 404 | kod olmayabilir | Şube/sipariş bağlamı artık mevcut değil; listeyi yenile. |
| 409 | `ORDER_WINDOW_CLOSED` | Formu salt okunur yapıp siparişleri yenile. |
| 409 | `ORDER_REVISION_CONFLICT` | Güncel siparişi tekrar getir; sessizce üzerine yazma. |
| 409 | `ORDER_FINALIZED` | İlgili teslim gününü kalıcı olarak salt okunur yap. |
| 409 | `IDEMPOTENCY_CONFLICT` | Aynı UUID farklı işlemde kullanılmış; yeni kullanıcı işlemi için yeni UUID üret. |
| 503 | `AUTH_UNAVAILABLE`, `ORDER_UNAVAILABLE`, `BRANCHES_UNAVAILABLE`, `DRIVER_ROUTE_UNAVAILABLE` | Geçici hata göster ve kontrollü yeniden deneme sun. |

Hata yanıtı mevcut olduğunda şu biçimdedir:

```json
{
  "code": "ORDER_WINDOW_CLOSED",
  "message": "Sipariş penceresi kapalı."
}
```

## 7. Tarih, tekrar deneme ve güvenlik

- `*Utc` alanları UTC olarak yorumlanmalı; arayüzde Türkiye saatine çevrilmelidir.
- `deliveryDate` takvim günüdür; saat dilimi dönüşümüyle başka güne kaydırılmamalıdır.
- GET çağrıları ağ hatasında tekrar denenebilir.
- PUT çağrısı yalnız aynı `Idempotency-Key` ve aynı gövdeyle güvenle tekrar edilir.
- `accessToken`, parola ve tam HTTP başlıkları analitik/hata servislerine gönderilmemelidir.
- Sertifika doğrulaması PROD uygulamasında hiçbir koşulda kapatılmamalıdır.
- Uygulama ekran görüntülerinde veya loglarda vergi numarası gibi müşteri bilgileri maskelenmelidir.

## 8. Otomatik smoke testi

Node.js 18+ bulunan geliştirici bilgisayarında:

```powershell
$env:YEPAS_BASE_URL='https://192.168.5.230:8443/api/v1'
$env:YEPAS_LOGIN_NAME='test-kullanici'
$env:YEPAS_PASSWORD='test-parolasi'
$env:YEPAS_ROLE='CUSTOMER'
node .\docs\mobile-api\smoke.mjs
```

Şoför testi için `YEPAS_ROLE='DRIVER'` kullanılır. Test parola veya token yazdırmaz ve
sipariş oluşturmaz/değiştirmez. Geliştirme sertifikası henüz işletim sistemi tarafından
güvenilir değilse yalnız iç DEV testinde geçici olarak:

```powershell
$env:YEPAS_ALLOW_SELF_SIGNED='true'
node .\docs\mobile-api\smoke.mjs
```

Bu seçenek PROD doğrulamasında kullanılmamalıdır.

Smoke betiğinin CUSTOMER ve DRIVER sözleşmelerine karşı kendi testi:

```powershell
node .\docs\mobile-api\smoke.test.mjs
```
