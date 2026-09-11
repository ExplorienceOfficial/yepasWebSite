# Yepas Bayi Sipariş (Mobil)

Yepas fırın dağıtım sisteminin **müşteri (bayi)** mobil uygulaması. Bayi, kendisine
tanımlı ürün kataloğundan ertesi güne sipariş girer. Admin panelindeki (`../src`)
veri modeli ve sipariş kurallarıyla uyumludur.

## Özellikler

- **Vergi numarası + şifre ile giriş.** Vergi numarasına birden fazla şube (bayi)
  bağlıysa **şube seçimi** otomatik belirir.
  - Çok şubeli demo: `1234567890` · şifre `1234` (3 şube)
  - Tek şube demo: `1111111111` · şifre `1234`
- **Alt sekmeler**: Siparişler · Profilim.
- **Şube değiştirme**: Giriş yapınca vergi numarasının tüm şubeleri oturuma
  kaydedilir. Profilim → "Şubelerim"den (veya ana ekrandaki "Şube" çipinden)
  tekrar şifre girmeden şubeler arası geçiş yapılır; sipariş bağlamı seçilen
  şubeye göre değişir.
- **Kayıtlı girişler**: Giriş yapılan hesap(lar) cihazda saklanır. Login
  ekranında "Kayıtlı Girişler" altında listelenir; kaç şube varsa hepsi görünür
  ve tek dokunuşla (şifresiz) otomatik giriş yapılır. Her hesap `×` ile kaldırılabilir.
- **Oturum kalıcılığı**: Uygulama arka plana atılınca hemen çıkış yapılmaz;
  ancak ~30 dakikayı aşan arka plandan sonra oturum kilitlenir ve login'e döner
  (kayıtlı hesap kalır — tek dokunuşla tekrar girilir). `kSessionTimeout`.
- **Demo sistem anahtarı**: Login ekranındaki "Sipariş sistemi (demo)" anahtarı
  admin'in sistemi kapatmasını simüle eder — kapalıyken giriş engellenir.
- **Yarının siparişi**: durum (verildi / bekliyor / istenmedi), toplam adet, çeşit sayısı.
- **Sipariş oluştur / düzenle**: kategoriye göre ürünler, görsel, adet sayacı, tam değer girişi.
- **Sipariş kuralı**: admin ayarına göre üst sınır (`Sabit limit` veya `Geçmiş ortalama`).
- **Yarın ürün istemiyorum**: siparişi kapatma.
- **Sipariş sistemi kapalı** durumunda giriş engellenir (kesim saati: 17:30).
- **Bugünkü teslimat**: kesinleşmiş sipariş (salt-okunur).

## Mimari

State için Flutter'ın kendi `ChangeNotifier` + `InheritedNotifier`'ı; kalıcılık
için `shared_preferences` kullanılır.

```
lib/
  main.dart              Uygulama girişi, tema, AppScope, oturum yaşam döngüsü
  models/models.dart     Product, Customer, Driver, DailyOrder ...
  data/seed_data.dart    Katalog + müşteriler (admin mockData.ts karşılığı)
  state/app_state.dart    Durum + oturum + kalıcılık (OperationsContext karşılığı)
  theme/app_theme.dart    Apple sistem paleti
  screens/                login · main_shell · home · order · delivery · profile
  widgets/                qty_stepper · status_badge · branch_switcher
assets/
  logo.png, urunler/*.jpg (web projesinden kopyalandı)
```

> Şu an tüm veriler cihazda tutulan tohum verilerdir (offline). Gerçek kurulumda
> `state/app_state.dart` içindeki aksiyonlar bir API'ye bağlanmalıdır.

## Çalıştırma

```bash
flutter pub get
flutter run                 # bağlı cihaz/emülatör
flutter run -d chrome       # web
flutter run -d web-server --web-port 8080   # tarayıcıdan localhost:8080
```

## Test

```bash
flutter analyze
flutter test
```

## Android notu

Ortamda **Java 21** kullanıldığı için şablonun varsayılanları güncellendi
(aksi halde `flutter build apk` hata verir):

- `android/gradle/wrapper/gradle-wrapper.properties` → Gradle **8.7** (Java 21 uyumlu)
- `android/settings.gradle` → AGP **8.3.0**, Kotlin **1.9.22** (AGP 8.1'in Java 21 jlink bug'ı için)

Debug APK: `flutter build apk --debug` → `build/app/outputs/flutter-apk/app-debug.apk`.

> `flutter doctor`, "Some Android licenses not accepted" diyebilir; gerekirse
> `flutter doctor --android-licenses` ile kabul edin (kod hatası değildir).
