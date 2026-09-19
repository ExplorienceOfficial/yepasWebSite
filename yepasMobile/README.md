# Yepas Bayi Sipariş (Mobil)

Yepas fırın dağıtım sisteminin **müşteri (bayi)** mobil uygulaması. Bayi, kendisine
tanımlı ürünlerden teslim gününe sipariş girer. Uygulama gerçek **YEPAS Mobil API
`v1`** sözleşmesine bağlıdır (`../README.md` ve `../openapi.yaml` — bu depodaki mobil
API dokümanları).

## Özellikler

- **Kullanıcı adı + parola ile giriş** (`POST /auth/login`, rol `CUSTOMER`).
  Token sekiz saat geçerlidir ve **güvenli cihaz deposunda** saklanır
  (`flutter_secure_storage`); loglanmaz.
- **Geçici parola**: `mustChangePassword` ise önce parola değiştirme ekranı zorunlu
  gösterilir (`POST /auth/change-password`, 12–128 karakter).
- **Alt sekmeler**: Siparişler · Profilim.
- **Şubeler** (`GET /customer/branches`): Hesaba birden fazla şube bağlıysa ana
  ekrandaki "Şube" çipinden veya Profilim → "Şubelerim"den tekrar giriş yapmadan
  geçilir; sipariş bağlamı seçilen şubeye (`legacyMbId`) göre değişir.
- **Sipariş bağlamı** (`GET /customer/branches/{legacyMbId}/order`): sunucunun
  hesapladığı teslim günü, sipariş penceresi (`window.isOpen`), ürünler ve mevcut
  sipariş birlikte gelir. Fiyat gösterilmez.
- **Sipariş oluştur / düzenle** (`PUT .../order`): ürün başına adet (`uStokId` +
  `aStokId`), `maxQuantity` sınırı, `revision` ile iyimser kilit ve her işlem için
  yeni `Idempotency-Key`. `409 ORDER_REVISION_CONFLICT`'te en son hal yeniden
  yüklenir, sessizce üzerine yazılmaz.
- **Ürün istemiyorum** (`NO_PRODUCT`, satırlar boş).
- **Sipariş penceresi kapalıyken** (`window.isOpen=false`) yeni giriş/değişiklik
  engellenir.
- Oturum, öne dönüldüğünde `GET /auth/me` ile tazelenir; token geçersizse (401)
  otomatik olarak giriş ekranına düşülür.

## Yapılandırma (README §Ortamlar)

API kökü **kaynak kodda sabit tutulmaz**, derleme zamanında `--dart-define` ile
verilir:

| Anahtar | Açıklama |
|---|---|
| `YEPAS_BASE_URL` | API kökü, örn. `https://192.168.5.230:8443/api/v1` (DEV, yalnız VPN/fabrika ağı) |
| `YEPAS_ALLOW_SELF_SIGNED` | Yalnız iç DEV: güvenilmeyen geliştirme sertifikasına izin verir. **PROD'da asla verilmez** (README §7) |

## Mimari

State için Flutter'ın kendi `ChangeNotifier` + `InheritedNotifier`'ı kullanılır.

```
lib/
  main.dart               Uygulama girişi, faz-tabanlı kök (splash/login/parola/uygulama)
  config/env.dart         --dart-define yapılandırması
  api/
    transport*.dart       Platforma göre HTTP (dart:io mobil, package:http web)
    api_client.dart       Başlıklar, JSON, hata → ApiException
    api_exception.dart    Hata kodu → Türkçe mesaj (README §6)
    yepas_api.dart        Tipli uçlar (auth + customer)
  models/models.dart      Identity, CustomerBranch, OrderWindow, Product, Order ...
  state/
    app_state.dart        Oturum + şubeler + sipariş bağlamı
    token_store.dart      Güvenli token deposu
  utils/                  dates (tr-TR) · format · ids (UUID v4)
  theme/app_theme.dart    Apple sistem paleti
  screens/                splash · login · change_password · main_shell · home · order · profile
  widgets/                qty_stepper · status_badge · branch_switcher
assets/
  logo.png
```

## Çalıştırma

```bash
flutter pub get

# Bağlı cihaz/emülatör (DEV)
flutter run \
  --dart-define=YEPAS_BASE_URL=https://192.168.5.230:8443/api/v1 \
  --dart-define=YEPAS_ALLOW_SELF_SIGNED=true

# Tarayıcı (yalnız UI önizleme; DEV API'sine tarayıcıdan erişilemez)
flutter run -d web-server --web-port 8080 \
  --dart-define=YEPAS_BASE_URL=https://192.168.5.230:8443/api/v1
```

## Test

```bash
flutter analyze
flutter test
```

## Android notu

`android/src/main/AndroidManifest.xml` içinde `INTERNET` izni tanımlıdır (release
derlemesinde de gerekir).

Ortamda **Java 21** kullanıldığı için şablonun varsayılanları güncellendi
(aksi halde `flutter build apk` hata verir):

- `android/gradle/wrapper/gradle-wrapper.properties` → Gradle **8.7** (Java 21 uyumlu)
- `android/settings.gradle` → AGP **8.3.0**, Kotlin **1.9.22**

Debug APK: `flutter build apk --debug` → `build/app/outputs/flutter-apk/app-debug.apk`.
