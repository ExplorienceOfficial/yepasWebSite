# YEPAS Mobil API Sözleşmesi

Bu belge müşteri mobil uygulamasının YEPAS API ile entegrasyonu içindir. Fiyat bilgisi hiçbir mobil uçta bulunmaz.

## 1. Durum ve adresler

- API sürümü: `v1`
- Geliştirme kökü: `http://localhost:5057/api/v1`
- Sunucu smoke kökü: `https://192.168.5.230:8443/api/v1`
- Nihai üretim alan adı ve güvenilir TLS sertifikası dağıtım öncesinde kesinleştirilecektir.
- Mobil uygulama sertifika doğrulamasını devre dışı bırakmamalıdır. Mevcut IP/self-signed sertifika sadece kontrollü smoke testi içindir.

Hazır olan bölümler:

- Müşteri girişi ve bearer token
- Oturum sorgulama ve çıkış
- Zorunlu parola değiştirme
- Hesaba bağlı müşteri şubelerini listeleme

Sipariş bağlamı ve sipariş kaydetme uçları, eski sistemdeki
`D00013.RS_MOBIL_SIPARIS_URUN_TANIMLARI` tablosunu şube anahtarı `MB_ID`
üzerinden kullanır.

## 2. Ortak kurallar

Mobil istemci bütün isteklerde aşağıdaki başlığı göndermelidir:

```http
X-Yepas-Client: mobile-v1
```

JSON gövdeli isteklerde ayrıca:

```http
Content-Type: application/json
```

Girişten sonra korumalı uçlarda:

```http
Authorization: Bearer {accessToken}
```

- JSON alanları `camelCase` olarak döner.
- Tarih/saatler ISO-8601 biçimindedir. Sonu `Z` ile biten değerler UTC'dir.
- Token ömrü 8 saattir.
- Token yalnızca işletim sisteminin güvenli anahtar deposunda saklanmalıdır. Düz metin tercihleri, loglar veya hata raporlarına yazılmamalıdır.
- `401` alındığında yerel oturum temizlenip giriş ekranına dönülmelidir.
- İlk beş hatalı parola denemesinden sonra hesap 15 dakika kilitlenir. Güvenlik nedeniyle giriş cevabı bunun ayrıntısını açıklamaz.

Standart hata örneği:

```json
{
  "code": "INVALID_LOGIN",
  "message": "Kullanıcı adı veya parola hatalı ya da hesap kapalı."
}
```

Bazı `400`, `401`, `403` ve `404` cevaplarının gövdesi boş olabilir; istemci yalnızca JSON hata gövdesine güvenmemelidir.

## 3. Önerilen mobil akış

1. `POST /auth/login` ile `CUSTOMER` rolünde giriş yap.
2. `mustChangePassword=true` ise diğer ekranları açmadan `POST /auth/change-password` çalıştır.
3. `GET /customer/branches` ile hesaba bağlı şubeleri getir.
4. Kullanıcı bir şube seçtiğinde `GET /customer/branches/{legacyMbId}/order` çağır.
5. Sipariş oluştururken/güncellerken `PUT /customer/branches/{legacyMbId}/order` çağır.
6. Başarılı kayıttan dönen `revision` değerini sonraki güncellemede kullan.
7. Çıkışta `POST /auth/logout` çağır ve yerel token'ı her durumda sil.

## 4. Kimlik doğrulama uçları

### 4.1 Giriş

`POST /auth/login`

Yetkilendirme istemez.

İstek:

```json
{
  "loginName": "MUSTERI001",
  "password": "gecici-parola",
  "role": "CUSTOMER"
}
```

Başarılı cevap — `200 OK`:

```json
{
  "userId": 42,
  "loginName": "MUSTERI001",
  "role": "CUSTOMER",
  "legacyPersonnelId": null,
  "mustChangePassword": true,
  "accessToken": "43-karakterlik-token"
}
```

Olası cevaplar:

- `400`: Eksik/geçersiz istek
- `401 INVALID_LOGIN`: Kullanıcı adı/parola hatalı, hesap pasif, geçici parola süresi dolmuş veya hesap kilitli
- `403`: HTTPS zorunluluğu ya da mobil istemci başlığı eksik
- `503 AUTH_UNAVAILABLE`: Giriş hizmeti/veritabanı erişilemiyor

### 4.2 Mevcut oturum

`GET /auth/me`

Başarılı cevap — `200 OK`:

```json
{
  "userId": 42,
  "loginName": "MUSTERI001",
  "role": "CUSTOMER",
  "legacyPersonnelId": null,
  "mustChangePassword": false
}
```

Olası cevaplar: `401`, `503 AUTH_UNAVAILABLE`.

### 4.3 Parola değiştirme

`POST /auth/change-password`

İstek:

```json
{
  "currentPassword": "gecici-parola",
  "newPassword": "en-az-12-karakter"
}
```

Kurallar:

- Yeni parola 12-128 karakter olmalıdır.
- Yeni parola mevcut paroladan farklı olmalıdır.
- Başarılı işlem mevcut token'ı açık bırakır, kullanıcının diğer açık oturumlarını kapatır.

Başarılı cevap: `204 No Content`.

Olası cevaplar:

- `400 PASSWORD_CHANGE_REJECTED`: Kural ihlali veya mevcut parola hatalı
- `401`: Oturum geçersiz
- `403`: Mobil istemci başlığı eksik
- `503 AUTH_UNAVAILABLE`

### 4.4 Çıkış

`POST /auth/logout`

Başarılı cevap: `204 No Content`.

Sunucu hatası olsa bile mobil uygulama yerel token'ı silmelidir.

## 5. Şube uçları

### 5.1 Hesaba bağlı şubeler

`GET /customer/branches`

Yalnızca oturum açan müşteri hesabına admin tarafından bağlanmış `LegacyMbId` kayıtlarını döndürür.

Başarılı cevap — `200 OK`:

```json
[
  {
    "legacyMbId": 1592,
    "legacyCustomerId": 120,
    "legacyDepartmentId": 7,
    "legacyPersonnelId": 30,
    "customerCode": "B.0001",
    "customerName": "ÖRNEK MARKET",
    "departmentName": "AKŞEMSETTİN",
    "taxNumber": "1234567890",
    "personnelName": "İSMAİL KAYA",
    "distributionDays": "Pzt, Sal, Çar, Per, Cum, Cmt, Paz"
  }
]
```

`legacyMbId`, sipariş uçlarına gönderilecek şube/operasyon anahtarıdır. `legacyCustomerId` tek başına kullanılmamalıdır; aynı müşterinin birden fazla şubesi olabilir.

Olası cevaplar:

- `401`: Oturum geçersiz
- `403`: Zorunlu parola henüz değiştirilmemiş
- `503 BRANCHES_UNAVAILABLE`

## 6. Sipariş uçları

> Ürünler şube bazında döner. Aynı müşteri hesabına bağlı farklı şubeler farklı
> ürün listeleri ve miktar sınırları alabilir.

### 6.1 Şubenin sipariş bağlamı

`GET /customer/branches/{legacyMbId}/order`

Başarılı cevap — `200 OK`:

```json
{
  "legacyMbId": 1592,
  "deliveryDate": "2026-09-18T00:00:00",
  "window": {
    "isOpen": true,
    "mode": "AUTO",
    "cutoffMinute": 1020,
    "deadlineUtc": "2026-09-17T14:00:00Z",
    "overrideUntilUtc": null
  },
  "products": [
    {
      "uStokId": 708,
      "code": "007.004",
      "name": "7 Lİ SANDVİÇ EKMEK 420 GR",
      "groupId": 1,
      "aStokId": 52,
      "variantName": "6.4 7 Lİ SANDVİÇ 420 GR",
      "maxQuantity": 100,
      "packageSize": 1
    }
  ],
  "order": null
}
```

`packageSize` ürün veya varyant adında 5'li/5 li ifadesi varsa 5, diğer
ürünlerde 1 döner. Miktar bu değerin katı olmalıdır; API uygun olmayan
miktarı `400 INVALID_ORDER` ile reddeder. Bu kural, eski sistemde ayrı
paket katsayısı kolonu doğrulanana kadar isimden türetilir.

Mevcut sipariş varsa `order`:

```json
{
  "orderId": 81,
  "legacyMbId": 1592,
  "deliveryDate": "2026-09-18T00:00:00",
  "status": "SUBMITTED",
  "revision": 2,
  "note": "Poşet ayrı olsun",
  "updatedAtUtc": "2026-09-17T10:30:00Z",
  "lines": [
    {
      "uStokId": 708,
      "aStokId": 52,
      "quantity": 25,
      "productCode": "007.004",
      "productName": "7 Lİ SANDVİÇ EKMEK 420 GR",
      "variantName": "6.4 7 Lİ SANDVİÇ 420 GR"
    }
  ]
}
```

Pencere modları:

- `AUTO`: Sipariş yalnız şubenin `SG_1...SG_7` teslimatından önceki gün kesim saatine kadar açıktır; saat geçince sonraki SG tarihine atlanmaz.
- `OPEN`: Admin tarafından geçici olarak açık
- `CLOSED`: Admin tarafından geçici olarak kapalı

Olası cevaplar: `400`, `401`, `403`, `404`, `503 ORDER_UNAVAILABLE`.

### 6.2 Sipariş oluşturma veya güncelleme

`PUT /customer/branches/{legacyMbId}/order`

Zorunlu ek başlık:

```http
Idempotency-Key: {her-kullanıcı-işlemi-için-yeni-UUID}
```

Ağ hatası nedeniyle aynı isteği tekrar gönderirken aynı anahtar ve aynı gövde kullanılmalıdır. Kullanıcı siparişi yeniden değiştirirse yeni anahtar üretilmelidir.

Yeni sipariş örneği:

```json
{
  "revision": 0,
  "status": "SUBMITTED",
  "note": "Poşet ayrı olsun",
  "lines": [
    {
      "uStokId": 708,
      "aStokId": 52,
      "quantity": 25
    }
  ]
}
```

Mevcut siparişi güncellerken `GET` cevabındaki güncel `revision` gönderilir. Başarılı cevapta revision bir artar.

Sipariş durumları:

- `SUBMITTED`: En az bir ürün satırı zorunlu
- `NO_PRODUCT`: “Ürün istemiyorum”; `lines` boş olmalı
- `CANCELLED`: Sipariş iptali; `lines` boş olmalı

“Ürün istemiyorum” örneği:

```json
{
  "revision": 2,
  "status": "NO_PRODUCT",
  "note": null,
  "lines": []
}
```

Kurallar:

- Miktar tam sayı ve `1..100000` aralığında olmalıdır.
- Aynı `uStokId` + `aStokId` çifti tekrarlanamaz.
- Yalnızca API'nin bu şube için döndürdüğü ürünler gönderilebilir.
- Not en fazla 500 karakterdir.
- `Idempotency-Key` en fazla 100 karakterdir.

Başarılı cevap — `200 OK`: Güncel `order` nesnesi.

Önemli hata cevapları:

- `400 IDEMPOTENCY_REQUIRED`: Başlık eksik
- `400 INVALID_ORDER`: Gövde, durum, ürün veya miktar geçersiz
- `401`: Oturum geçersiz
- `403`: Şubeye erişim yok, parola değişmemiş veya mobil başlık eksik
- `404`: Şube operasyon kaydı yok
- `409 ORDER_WINDOW_CLOSED`: Sipariş saati geçmiş/admin kapatmış
- `409 ORDER_REVISION_CONFLICT`: Başka işlem siparişi güncellemiş; GET ile yenile
- `409 IDEMPOTENCY_CONFLICT`: Aynı anahtar farklı gövdeyle tekrar kullanılmış
- `503 ORDER_UNAVAILABLE`

## 7. Kısa cURL örneği

```bash
curl -X POST "https://SUNUCU/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Yepas-Client: mobile-v1" \
  -d '{"loginName":"MUSTERI001","password":"PAROLA","role":"CUSTOMER"}'
```

```bash
curl "https://SUNUCU/api/v1/customer/branches" \
  -H "X-Yepas-Client: mobile-v1" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 8. Mobil geliştiriciye teslim kontrol listesi

- API kök adresi build flavor/environment değişkeninden alınmalı; koda sabitlenmemeli.
- Token güvenli depoda tutulmalı ve loglanmamalı.
- `mustChangePassword` akışı atlanmamalı.
- Şube anahtarı olarak `legacyMbId` kullanılmalı.
- Sipariş güncellemelerinde optimistic concurrency için `revision` korunmalı.
- Her yeni kaydetme işlemi için yeni `Idempotency-Key` üretilmeli.
- `401`, `403`, `409` ve `503` durumları ayrı kullanıcı deneyimleriyle ele alınmalı.
- Fiyat alanı beklenmemeli veya arayüzde gösterilmemeli.
- Ürün tablosu tamamlanmadan sahte ürünlerin üretim API'sine gönderilmemesi gerekir.
