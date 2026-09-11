# Yepas Bayi Sipariş (Mobil)

Yepas fırın dağıtım sisteminin **müşteri (bayi)** mobil uygulaması. Bayi, kendisine
tanımlı ürün kataloğundan ertesi güne sipariş girer. Admin panelindeki (`../src`)
veri modeli ve sipariş kurallarıyla uyumludur.

## Özellikler

- **Vergi numarası + şifre ile giriş.** Vergi numarasına birden fazla şube (bayi)
  bağlıysa **şube seçimi** otomatik belirir.
  - Çok şubeli demo: `1234567890` · şifre `1234` (3 şube)
  - Tek şube demo: `1111111111` · şifre `1234`
- **Yarının siparişi**: durum (verildi / bekliyor / istenmedi), toplam adet, çeşit sayısı.
- **Sipariş oluştur / düzenle**: kategoriye göre ürünler, görsel, adet sayacı, tam değer girişi.
- **Sipariş kuralı**: admin ayarına göre üst sınır (`Sabit limit` veya `Geçmiş ortalama`).
- **Yarın ürün istemiyorum**: siparişi kapatma.
- **Sipariş sistemi kapalı** durumunda giriş engellenir (kesim saati: 17:30).
- **Bugünkü teslimat**: kesinleşmiş sipariş (salt-okunur).

## Mimari

Harici bağımlılık yok — Flutter'ın kendi `ChangeNotifier` + `InheritedNotifier`'ı kullanılır.

```
lib/
  main.dart              Uygulama girişi, tema, AppScope
  models/models.dart     Product, Customer, Driver, DailyOrder ...
  data/seed_data.dart    Katalog + müşteriler (admin mockData.ts karşılığı)
  state/app_state.dart    Durum + sipariş kuralları (OperationsContext karşılığı)
  theme/app_theme.dart    Apple sistem paleti
  screens/                login · home · order · delivery
  widgets/                qty_stepper · status_badge
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
