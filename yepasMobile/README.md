# Yepas Bayi Sipariş (Mobil)

Yepas fırın dağıtım sisteminin **müşteri (bayi)** mobil uygulaması. Bayi, kendisine
tanımlı ürün kataloğundan ertesi güne sipariş girer. Admin panelindeki (`../src`)
veri modeli ve sipariş kurallarıyla uyumludur.

## Özellikler

- **Gerçek müşteri hesabıyla giriş.** Kullanıcı adı ve parola API üzerinde
  doğrulanır; demo müşteri parolası uygulamada tutulmaz.
- **Zorunlu parola değişimi.** Geçici parolayla ilk girişte diğer ekranlar
  açılmadan yeni parola belirlenir.
- **Alt sekmeler**: Siparişler · Profilim.
- **Şube değiştirme**: Giriş yapınca vergi numarasının tüm şubeleri oturuma
  kaydedilir. Profilim → "Şubelerim"den (veya ana ekrandaki "Şube" çipinden)
  tekrar şifre girmeden şubeler arası geçiş yapılır; sipariş bağlamı seçilen
  şubeye göre değişir.
- **Sunucu kaynaklı şubeler.** Girişten sonra yalnızca admin tarafından hesaba
  bağlanan `MB_ID` şubeleri yüklenir ve şubeler arasında parola girmeden geçilir.
- **Oturum güvenliği.** Erişim anahtarı diske yazılmaz. Uygulama kapatılırsa veya
  30 dakikadan uzun süre arka planda kalırsa yeniden giriş gerekir.
- **Kullanıcı adımı hatırla.** Yalnızca kullanıcı adı saklanır. Parola hiçbir
  zaman diske yazılmaz; eski sürümün düz metin parola kaydı açılışta silinir.
- **Yarının siparişi**: durum (verildi / bekliyor / istenmedi), toplam adet, çeşit sayısı.
- **Kalan süre**: kesim saatine 3 saatten az kaldığında "Yarın teslim edilecek
  sipariş için X dk kaldı" yazısı görünür ve dakikası dakikasına güncellenir.
- **Sipariş oluştur / düzenle**: kategoriye göre ürünler, görsel, adet sayacı, tam değer girişi.
  Ürün adları kısaltılmaz; uzun adlar alt satıra sarılır.
- **5'li paket ürünler**: adet sayacı 5'er 5'er ilerler, elle girilen değer en yakın
  5'in katına yuvarlanır (3 adet girilemez) ve üst sınır da 5'in katına inilir.
- **Sipariş limiti**: müşteriye tanımlanan ürünün sunucudan gelen üst sınırı.
- **Yarın ürün istemiyorum**: siparişi kapatma. Kapatıldığında ana ekranda
  "Alındı · Sipariş istenmedi" kutusu görünür.
- **Sipariş sistemi kapalı** durumunda giriş ekranı `GET /api/v1/system/status`
  yanıtına göre "Giriş yap" düğmesini kaldırıp **"Sistem kapalı"** yazar. Durum
  sunucudan okunamazsa ekran normal açılır (kapalı varsayılmaz).
- **Bugünkü teslimat** ekranı, gerçek veri ucu henüz bağlanmadığı için ana
  ekrandan kaldırılmıştır; örnek teslimat gösterilmez.

## Mimari

State için Flutter'ın kendi `ChangeNotifier` + `InheritedNotifier`'ı kullanılır.
`shared_preferences` yalnız hatırlanan kullanıcı adını ve seçimini tutar; parolayı tutmaz. Erişim anahtarı (bearer token) hiçbir
zaman diske yazılmaz.

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

> Giriş, parola değişimi, şube listesi, müşteriye tanımlı ürünler ve sipariş
> oluşturma/güncelleme/ürün istemiyorum işlemleri gerçek API'ye bağlıdır.

## Çalıştırma

```bash
flutter pub get
flutter run --dart-define=YEPAS_API_BASE_URL=http://10.0.2.2:5057
flutter run --dart-define=YEPAS_API_BASE_URL=https://SUNUCU_ADRESI
```

## Test

```bash
flutter analyze
flutter test
```

> **Windows'ta Smart App Control uyarısı.** Bu makinede Smart App Control açık
> (`HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy` → `VerifiedAndReputablePolicyState = 1`)
> ve Flutter SDK'nın imzasız `dart.exe` dosyasının alt işlem başlatmasını
> engelliyor; her `flutter` komutu
> `ProcessStarter::StartForExec failed: Uygulama Denetimi ilkesi bu dosyayı engelledi`
> hatası veriyor. Statik analiz bu kısıtlamadan etkilenmeyen AOT çalıştırıcıyla
> yapılabilir:
>
> ```bash
> FLUTTER_ROOT=/c/Users/ASUS/develop/flutter /c/Users/ASUS/develop/flutter/bin/cache/dart-sdk/bin/dartaotruntime.exe /c/Users/ASUS/develop/flutter/bin/cache/dart-sdk/bin/snapshots/dartdev_aot.dart.snapshot analyze
> ```
>
> `flutter test` / `flutter run` ayrı `flutter_tester` işlemi başlattığı için
> Smart App Control kapatılmadan çalışmaz (Windows Güvenliği → Uygulama ve
> tarayıcı denetimi → Smart App Control → Kapalı; bu ayar bir kez kapatıldıktan
> sonra Windows yeniden kurulmadan geri açılamaz).

## Android notu

Ortamda **Java 21** kullanıldığı için şablonun varsayılanları güncellendi
(aksi halde `flutter build apk` hata verir):

- `android/gradle/wrapper/gradle-wrapper.properties` → Gradle **8.7** (Java 21 uyumlu)
- `android/settings.gradle` → AGP **8.3.0**, Kotlin **1.9.22** (AGP 8.1'in Java 21 jlink bug'ı için)

Debug APK: `flutter build apk --debug` → `build/app/outputs/flutter-apk/app-debug.apk`.

> `flutter doctor`, "Some Android licenses not accepted" diyebilir; gerekirse
> `flutter doctor --android-licenses` ile kabul edin (kod hatası değildir).
