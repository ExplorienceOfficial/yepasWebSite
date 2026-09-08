# Yepaş · Ekmek Dağıtım Bilgi Sistemi (Demo)

Ertesi günün ekmek ve unlu mamul üretim/dağıtım operasyonu için hazırlanmış iki ayrı
girişli panel demosu:

- **`/admin`** — operasyon yöneticisi paneli (sipariş onayı, üretim emri, ürün kataloğu)
- **`/sofor`** — şoför portalı (rota listesi, araç yükleme özeti, teslimat takibi)

Veritabanı bağlantısı yoktur; tüm veri `src/data/mockData.ts` içinden gelir ve React Context
(`OperationsProvider`) üzerinden dinamik olarak yönetilir.

## Çalıştırma

```bash
npm install
```

```bash
npm run dev
```

`http://localhost:3000` adresi giriş türü seçim ekranını açar.
Diğer komutlar: `npm run build` (production derleme), `npm run lint` (ESLint).

## Giriş bilgileri (demo)

| Rol | Giriş adresi | Kimlik |
| --- | --- | --- |
| Admin | `/admin/giris` | `admin` / `yepas2026` · `planlama` / `yepas2026` |
| Şoför | `/sofor/giris` | `SFR-01` / `1401` — Hakan Demir |
| | | `SFR-02` / `1118` — Mustafa Yılmaz |
| | | `SFR-03` / `1232` — Erkan Şahin |
| | | `SFR-04` / `1305` — Serkan Aydın |
| | | `SFR-05` / `1417` — Bülent Koç |

Bilgiler giriş ekranlarında da listelenir. Oturum `localStorage` üzerinde tutulur; tarayıcı
başına tek oturum vardır, yani şoför girişi yapıldığında admin oturumu kapanır.

> **Güvenlik notu:** Doğrulama tamamen istemci tarafındadır ve yalnızca demo akışını
> canlandırmak içindir. Gerçek kurulumda parolalar istemci paketinde bulunmamalı, kontrol
> sunucu tarafında (middleware / session cookie) yapılmalıdır.

## Teknoloji

| Katman    | Seçim                                    |
| --------- | ---------------------------------------- |
| Framework | Next.js 16 · App Router · TypeScript     |
| Stil      | Tailwind CSS v4 (CSS-first yapılandırma) |
| İkonlar   | lucide-react                             |
| Tipografi | Inter (arayüz) + JetBrains Mono (sayı)   |
| State     | React Context + `useState` / `useMemo`   |
| Oturum    | `useSyncExternalStore` + `localStorage`  |

## Klasör yapısı

```
src/
├─ app/
│  ├─ layout.tsx                     # font, global stil, OperationsProvider, Toaster
│  ├─ page.tsx                       # giriş türü seçim ekranı (/)
│  ├─ (giris)/                       # panel yerleşimlerinin dışında kalan login rotaları
│  │  ├─ admin/giris/page.tsx        # /admin/giris
│  │  └─ sofor/giris/page.tsx        # /sofor/giris
│  ├─ admin/                         # RequireRole="admin" ile korunur
│  │  ├─ layout.tsx                  # guard + sidebar + kontrol barı
│  │  ├─ page.tsx                    # Genel Bakış
│  │  ├─ siparisler/page.tsx         # Günlük sipariş operasyonu
│  │  ├─ urunler/page.tsx            # Hiyerarşik ürün kataloğu
│  │  └─ soforler/page.tsx           # Şoför & dağıtım takibi
│  └─ sofor/                         # RequireRole="driver" ile korunur
│     ├─ layout.tsx                  # guard + şoför üst barı
│     └─ page.tsx                    # Rotam: yükleme listesi + duraklar
├─ components/
│  ├─ admin/                         # Panele özel bileşenler (ControlBar, OrderDrawer, ...)
│  ├─ auth/                          # LoginLayout, RequireRole
│  ├─ sofor/                         # DriverBar
│  └─ ui/                            # Genel primitifler (Button, Badge, Modal, Drawer, ...)
├─ context/
│  ├─ AuthContext.tsx                # oturum store'u, loginAdmin / loginDriver / logout
│  └─ OperationsContext.tsx          # operasyon state'i, aksiyonlar, türetilmiş metrikler
├─ data/
│  ├─ accounts.ts                    # demo admin hesapları
│  └─ mockData.ts                    # 17 ürün, 5 şoför, 24 müşteri, 24 günlük sipariş
├─ lib/                              # format yardımcıları + şoför istatistikleri
└─ types/index.ts                    # Ortak TypeScript tipleri
```

`OperationsProvider` kök yerleşimde durur; bu sayede admin ve şoför ekranları aynı veriyi
paylaşır — şoförün işaretlediği teslimat, admin tarafındaki rota kartında anında görünür.

## Admin paneli

### Üst kontrol barı

- **Kill switch** — "Müşteri Sipariş Sistemi: AÇIK / KAPALI". Açıkken yeşil, kapalıyken kırmızı
  gösterilir; son durum değişikliği zamanı yanında tutulur ve her değişimde toast düşer.
- **Bilgileri Aktar (DB'ye Yaz)** — ERP senkronizasyonunu simüle eder: 1,6 sn loading, ardından
  "Siparişler başarıyla aktarıldı" bildirimi, son aktarım zamanı ve "ERP ile senkron" durumu
  güncellenir. Aktarılmamış değişiklik varsa butonda kırmızı nokta belirir.
- Alt şeritte anlık sayaçlar: sipariş veren / istemeyen / bekleyen / toplam üretim adedi.

### Ürün kataloğu (`/admin/urunler`)

- Ana kategori → alt varyasyon hiyerarşisi (Günlük Ekmek → *3 Çizgili Üstü*, *Kepekli*,
  *Tam Buğday*, *Tava Ekmek*; Roll Ekmek → *Sade*, *Kepekli*, *Çavdarlı* …). Kategoriler
  açılıp kapanabilir.
- Ürün ekleme/düzenleme modali: ad, kategori, kod, gramaj, birim fiyat, **maksimum sipariş
  limiti**, **önerilen/ortalama adet**, fotoğraf URL (canlı önizlemeli) ve görünürlük anahtarı.
- Her satırda o ürünün yarınki toplam talebi ve satışa açık/kapalı switch'i yer alır.

### Günlük sipariş operasyonu (`/admin/siparisler`)

- Müşteri bazlı tablo: bayi, atanmış şoför, durum rozeti, kalem özeti, adet, tutar, giriş saati.
  - 🟢 **Sipariş Verildi** — kalemler satır içinde listelenir (`180× 3 Çizgili Üstü` …)
  - 🔴 **Ürün İstemedi** — müşteri aktif olarak pas geçti, notu gösterilir
  - 🟡 **Beklemede** — henüz giriş yapılmadı
- Filtreler: serbest metin arama, şoföre göre ve duruma göre (sayaçlı sekmeler).
- **Düzenleme drawer'ı**: durumu değiştirme, kalem adedini artırma/azaltma (maksimum limit
  aşılamaz), kalem silme, katalogdan kalem ekleme, müşteri notu ve künye bilgileri. Admin
  müdahalesi yapılan siparişler "admin düzenledi" işaretiyle ayrışır.

### Şoför & dağıtım (`/admin/soforler`)

- Her şoför için sabit bayi listesi, durak sırası ve durum noktaları.
- Rota başına teslimat / pas / bekleyen sayıları, yüklenecek adet, sevkiyat tutarı,
  kasa doluluğu (kapasite aşımında kırmızı uyarı) ve **teslim edilen durak sayısı**.
- Bayiye tıklandığında aynı sipariş düzenleme drawer'ı açılır.

## Şoför portalı (`/sofor`)

Telefon üzerinden kullanılacak şekilde tek sütun ve dokunmatik hedefleri geniş tasarlandı.

- **Özet**: teslimat yapılacak durak, pas geçilen bayi, giriş bekleyen bayi, yüklenecek toplam
  adet ve kasa sayısı.
- **Teslimat ilerlemesi**: tamamlanan durak oranı ve ilerleme çubuğu.
- **Araç yükleme listesi**: şoförün rotasındaki tüm siparişlerin ürün bazında toplamı —
  fırından araca kaç adet / kaç kasa yükleneceğini gösterir.
- **Durak listesi**: durak sırasına göre bayiler; sipariş kalemleri, müşteri notu, yetkiliyi
  arama bağlantısı ve **"Teslim edildi"** işaretleme (saat damgalı, geri alınabilir).
  Ürün istemeyen bayiler "durağı atlayın" uyarısıyla, giriş yapmayanlar sarı uyarıyla gösterilir.

## Tasarım notları

Palet nötr zinc tonları üzerine kurulu; aksan rengi fırıncılık operasyonuna yakışan
kehribar (`amber-600`), sistem durumları için `emerald` / `rose` / `amber` kullanılır.
Yerleşim kompakt padding, ince ayraçlar ve `rounded-md` köşelerle kontrol odası hissi
verecek şekilde kurgulanmıştır. Sayısal alanlar `tabular-nums` monospace ile hizalanır.

## Demo verisi hakkında

Operasyon state'i yalnızca bellekte tutulur — sayfa **yenilendiğinde** mock veri başlangıç
hâline döner (oturum bilgisi `localStorage`'da kaldığı için giriş korunur). Ürün fotoğrafları
`public/urunler/` altındadır. Gerçek bir API bağlanacağı zaman `OperationsContext` içindeki
aksiyonların gövdesini fetch çağrılarıyla değiştirmek yeterlidir; bileşenler yalnızca context
arayüzüne bağlıdır.
