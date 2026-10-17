# Canlı sipariş güncellemesi — çalışma durumu

## Güncel sunucu doğrulaması — 2026-10-17

- Kullanıcı 0.6.2-rc.1 sürümünü Windows 7 IIS üzerinde kurdu; aktif site yolu
  `C:\YepasApp\releases\0.6.2-rc.1\site`. Migration 012–014 uygulandı (sürüm 14);
  bildirim checkpoint tablosuna doğrulanan uygulama kullanıcısı için SELECT/UPDATE verildi.
- Var olan şifreli bağlantı ayarları korundu; realtime ayarları machine-bound DPAPI
  ile kaydedildi. Windows/Linux anahtar özetleri kullanıcıyla karşılaştırılarak eşleşti.
  Anahtarlar/tokenlar repoya alınmadı.
- UTC bilet düzeltmesinden sonra canlı bağlantı uyarısı kayboldu. Kullanıcı iki ayrı
  admin tarayıcı oturumuyla sipariş değişikliğinin yenilemeden anında diğer ekrana
  geldiğini doğruladı. Bu, Windows API -> Linux -> açık admin paneli akışının testidir.
- Mobil -> admin testi tek VPN oturumu kısıtı nedeniyle müşteri Wi-Fi ağında bekliyor.
  Sunucuda yeni PIN/kullanıcı adı/çoklu şube/not akışları, Linux kesintisinde kayıt ve
  toparlanma ve yeni sürümde 00:01 aktarımı ayrıca doğrulanmalı. Yerel otomatik testler geçti.
- Yepas Daily Export görevi kurulum sırasında kapatıldı, kullanıcı tekrar etkinleştirme
  komutunu çalıştırdığını teyit etti. Yeni sürümle gece otomatik aktarım sonucu henüz görülmedi.
- DNS/public erişim ertelendi. Alt bölümlerdeki 'henüz kurulmadı' notları önceki
  geliştirme aşamalarının tarihsel durumudur; güncel kurulum için bu bölüm esas alınır.

## 2026-10-17 kararı ve doğrulanan kurulum durumu

- Kullanıcı kararı: public DNS ve internete açılış şimdilik ertelendi. Önce VPN/LAN içinde canlı güncelleme kurulumu tamamlanacak. Henüz dış erişim açılmış değildir.
- Geçici adres: `https://yepas-gateway.test:9443`. Windows API yayın adresi `/internal/orders-changed`, admin tarayıcısının hub adresi `/hubs/orders` olacak. Bu yeni adresler Windows uygulama ayarlarına henüz uygulanmadı.
- Linux IP'si `192.168.5.135`. Windows 7 ve kullanıcının kendi bilgisayarında hosts eşlemesi, sertifika güveni ve yeni adreste 404 doğrulandı. Kullanıcının ilk zaman aşımında trafik ev ağ geçidine gidiyordu; VPN yeniden bağlanınca SonicWall üzerinden 10.10.10.10 kaynak adresiyle 22 ve 9443 port testleri geçti.
- Linux SignalR 0.1.1 derleme ve gerçek WebSocket/güvenlik testleri geçti; systemd servisi ve Caddy kuruldu. Windows canlı güncelleme paketi, gerekli migration/izin/config kurulumu ve uçtan uca mobil sipariş -> açık admin ekranı testi henüz tamamlanmadı.
- Caddy yaprak sertifikası RSA yerine ECDSA P-256 olarak yeniden üretildi; aynı kök CA korundu. IP erişiminde Windows 7 tarayıcısı adres uyuşmazlığı gösterdi; DNS adıyla 404 testi geçti. Caddy site adresleri şu anda `https://192.168.5.135:9443, https://yepas-gateway.test:9443`; `tls internal { key_type p256 }` kullanılıyor. Sertifika doğrulaması kapatılmadı.
- Windows paketi `artifacts/yepas-0.6.0-rc.1.zip` olarak üretildi, henüz sunucuya kurulmadı. Next statik export, API/AdminTool/AutoExport Release derlemeleri başarılı. Bilet, publisher, izole SQL gün kapanışı/arıza izolasyonu, TypeScript ve lint kontrolleri geçti. Yeni `tests/realtimeConfiguration.test.ps1` makineye bağlı şifreli appSettings, ikinci kurulum, mevcut şifreli bağlantılara dokunulmaması ve hatalı girdinin dosyayı değiştirmemesi testlerini geçti. DPAPI testi sandbox dışında çalıştırıldı; sırlar yalnız GUID adlı geçici fixture içinde test verisiydi, fixture temizlendi.
- Paket `INSTALL-REALTIME.md` içerir. `Yepas.AdminTool.exe --configure-realtime` gizli girişle aynı Linux anahtarını alır; yeni anahtarı düz metin kaydetmeden appSettings bölümünü makineye bağlı DPAPI ile korur. Komut satırından anahtar verilmez. Gerçek anahtar repoya/pakete eklenmez. 00:01 Windows görevi korunur.

### Sonraya bırakılan public erişim işleri

1. Müşterinin bilişimcisiyle `api.yepas.com.tr` kullanımını, sabit public IP/CGNAT durumunu ve mevcut 80/443 servisleriyle çakışmayı doğrulamak. Alan adının tanımlı olduğu varsayılmayacak.
2. DNS yönetiminde yalnız ilgili alt alan adını public IP'ye yönlendirmek; ana web sitesi, e-posta ve nameserver kayıtlarını değiştirmemek. Ağ yönlendirmesi gerekiyorsa public TCP 80/443 yalnız Linux VM'ye ulaşmalı; mevcut VPN test servisi hazırlık bitmeden internete açılmamalı.
3. Public Caddy yapılandırması, otomatik güvenilir HTTPS sertifikası, API ve WebSocket proxy yollarını hazırlamak. `/internal/*` dış erişime kapalı kalmalı; Windows 7/SQL/RDP/SSH internete doğrudan açılmamalı.
4. Windows publisher için iç ağdaki güvenilir adresi korumak veya kontrollü değiştirmek; tarayıcı hub adresi ve mobil API taban adresini public adrese taşımak. Shared key, bilet doğrulaması, origin/CORS, çerez/CSRF ve giriş hız sınırlarını doğrulamak. DNS değişikliği tek başına kurulumun tamamlandığı anlamına gelmez.
5. Admin paneli Vercel'de kalacak. `admin.yepas.com.tr` Vercel'e bağlanması önerildi, henüz kesinleştirilmedi/tanımlanmadı. DNS hedefi gerçek Vercel projesinin verdiği kayıt olmalı; tahmini CNAME kullanılmamalı.
6. Güvenlik güncellemeleri, arıza izolasyonu, yük ve VPN kapalı uçtan uca testleri tamamlanmadan canlıya hazır ilan etmemek. Mobilciye kalıcı adres ve güncel API dokümanını doğrulanan kurulumdan sonra vermek.

## Hazırlanan temel

### 0.6.2-rc.1: SQL UTC bilet düzeltmesi

Sunucuda 0.6.1 kurulumu sonrası Windows ve Linux anahtar özetleri eşleşmesine rağmen
Linux `Invalid realtime ticket` döndürdü. SQL GETUTCDATE sonucu DateTimeKind.Unspecified
olarak geliyordu; bilet imzasında ToUniversalTime bunu Windows yerel saati sanıp ikinci
kez ofset uyguluyordu. OrderRepository.ReadSettings artık SQL UTC değerini açıkça
DateTimeKind.Utc ile döndürüyor. Veritabanı/Windows saatleri ve bilet güvenlik süreleri
değiştirilmedi. Yeni GUID test DB'siyle gerçek SQL -> repository -> bilet -> gerçek UTC
doğrulama regresyonu ve diğer kapanış/arıza izolasyonu testleri geçti.
0.6.2 için ek migration veya anahtar değişimi yok; kurulu 0.6.1 şifreli Web.config
aynı Windows makinesinde korunmalı. Sunucuda yeni sürümün WebSocket testi henüz bekliyor.

- Linux: ASP.NET Core 10 SignalR hub; yalnız WebSocket, Long Polling kapalı.
- Windows API: `GET /api/v1/admin/realtime/ticket`; gerçek ADMIN oturumu ve parola-değiştirme şartı kontrol edilir.
- HMAC-SHA256 bilet: 32+ rastgele bayt anahtar, 5 dakika ömür, admin/publish amaçları ayrı. SQL UTC saati ile oluşturulur.
- Hub yalnız `OrdersChanged` geçersizleştirme sinyali gönderir. Sipariş/müşteri içeriği yayına konmaz.
- Tam HTTPS Origin izin listesi; WebSocket Origin ayrıca kontrol edilir. Kimlik süresi dolunca bağlantı kapanır.
- İç yayın çağrıları kısa ömürlü imzalı biletle doğrulanır ve aynı nonce tekrar kabul edilmez.

Linux'ta ilk gerçek WebSocket/auth yayın testi geçti. Nullability uyarıları yeni kaynakta düzeltildi; yeni Linux derlemesiyle tekrar doğrulanacak.

Panel artık tek bir WebSocket dinleyicisi kullanır; 15 saniyelik interval kaldırıldı. Bağlantı/yeniden bağlantıda ve `OrdersChanged` olayında mevcut API'den liste/durum yenilenir. Bağlantı yoksa görünür uyarı ve manuel Yenile kalır. Oturum kapanınca bağlantı durur. Yalnız başarısız bağlantı denemeleri artan gecikmeyle tekrarlanır; periyodik sipariş sorgusu yoktur.

Sipariş/ayar/aktarım transaction'ları **hiçbir bildirim tablosuna yazmaz**. Sipariş oluşturma/değişiklik/iptal, ayar değişikliği ve manuel/otomatik aktarım başarılı commit'ten SONRA yalnız hata yalıtımlı bildirim kontrolünü çağırır. Kontrol hatası sipariş sonucuna taşınmaz. Publisher HTTPS ve 1 saniye HTTP timeout kullanır. AutoExport aktif site appSettings'ini ayrıca okuyarak publisher'a aktarır.

**Henüz sunucuya kurulmadı; uçtan uca tamamlanmadı.** Eski transactional outbox tasarımı iptal edildi; 012'deki tablo artık kod tarafından kullanılmaz (sürüm sıralaması korunur). Migration 013 yalnız bildirim takip tablosu RealtimeDeliveryState'i ekler: son gönderilen SHA256 durum özeti ve SQL Türkiye saatli DeliveredAt. Sipariş/audit/ayar/aktarım kayıtları zaten kalıcı değişiklik kaynağıdır. Worker mevcut kaynak durumuyla son gönderilen özeti karşılaştırır. Fark varsa tek yenileme sinyali gönderir; 204 aldıktan sonra yalnız gönderim ÖNCESİNDE okuduğu özeti kaydeder. Gönderim sırasındaki yeni değişiklik sonraki kontrolde yakalanır.

IIS kayıtlı worker, uygulama çalışırken 10 saniyede bir kaynak durum özetiyle teslim edilmiş özeti uzlaştırır. Bu **sunucu tarafında periyodik SQL kontrolüdür**; tarayıcı polling yapmaz. Yeni commit hemen gönderimi dener. Commit sonrası process kapanırsa kaynak kayıtlar kalıcı olduğundan sonraki uygulama başlangıcı toparlar. IIS kapalı/idle iken teslim yoktur; uygulama yeniden çalışınca devam eder. Kesintisiz servis ve büyük audit geçmişi için bu kontrolün maliyeti yük testinde ölçülmelidir. Bu yapı her revizyon için ayrı event garantisi vermez; amaç paneli en güncel duruma getirmektir.

**Arıza izolasyonu:** bildirim tablosu eksik/bozuk, SELECT/UPDATE izni eksik, anahtar/config hatalı veya Linux/ağ kapalıysa sipariş, ayar ve aktarım commit'i geri alınmaz. Takip tablosu okunamazsa doğrudan sinyal yine denenir; takip yazılamazsa tekrar bildirim olabilir. Kaynak okuma bozulursa yalnız bildirim kontrolü durur. Tablo düzeldiğinde kalıcı kaynak değişikliği yeniden algılanır. Genel SQL/veritabanı arızası veya siparişin kendi zorunlu tablolarının bozulması bu garantinin kapsamında değildir. Kaynak audit kayıtlarının uygulama tarafından append-only tutulduğu varsayılır; elle değiştirme/identity reseed desteklenmez.

## Tamamlanacak işler

1. Linux projesini .NET 10 SDK ile derleyip gerçek WebSocket/auth entegrasyon testlerini çalıştırmak.
2. HTTPS reverse proxy ve systemd servisi; sertifika güveni ve iç port erişim kısıtlaması. `/internal/` dışarıya yayınlanmayacak.
3. Commit sonrası publisher entegrasyonunu gerçek ortamda doğrulamak; başarısız/tekrar istekler ve kapalı günler için mükerrer sinyal kontrolü.
4. Kaynak uzlaştırmasını gerçek IIS recycle/Linux kesintisiyle test etmek; uygulama yeniden başladığında son durum gönderilmeli. DB takip izinlerini doğrulamak.
5. Hazır panel istemcisinin gerçek tarayıcıdaki yeniden bağlantı/bilet yenileme/oturum kapanışı davranışını test etmek.
6. Kontrol paneli, sipariş listesi ve aktarım uyarısının aynı olayla yenilendiğini ve bekleyen düzenleme taslağını ezmediğini doğrulamak.
7. VPN içinde müşteri güncellemesi → açık admin ekranı testi; Linux kapalıyken sipariş/aktarımın devam etmesi ve yeniden bağlanınca liste doğrulaması.

## Yapılandırma (gerçek sırlar repoya yazılmaz)

Windows appSettings: `YepasRealtimeHubUrl` (HTTPS, `/hubs/orders`), `YepasRealtimePublishUrl` (HTTPS, `/internal/orders-changed`) ve `YepasRealtimeKey` (base64).
Linux environment: `Yepas__RealtimeKey` (aynı key), `Yepas__AllowedOrigins` (noktalı virgülle ayrılmış tam HTTPS kökenler).
Kestrel yalnız loopback veya gerekli özel arayüzde dinleyecek. Gerçek anahtarlar korumalı config/environment dosyasında saklanacak; paket manifestine veya loga yazılmayacak.

SignalR bağlantısındaki kısa ömürlü `access_token` query parametresi proxy loglarında da maskelenmeli. ASP.NET istek logları Warning seviyesine ayarlanmıştır; proxy log güvenliği ayrıca gereklidir.

Runtime çalıştırmaya yeterlidir; Linux üzerinde derleme için SDK ayrıca gerekir. SDK'yı üretimde kalıcı tutmak zorunlu değildir; ileride CI/local publish paketi gönderilebilir.

## Test

`powershell -NoProfile -ExecutionPolicy Bypass -File tests/realtimeTicket.test.ps1`

Bu test shared HMAC bilet kurallarını .NET Framework üzerinde çalıştırır; Linux hub çalışma/Origin/auth/expiry/replay ağ testlerinin yerine geçmez.

`powershell -NoProfile -ExecutionPolicy Bypass -File tests/realtimePublisher.test.ps1`

Publisher kapalı/bozuk/unreachable iken kayda hata taşımadığını kontrol eder.

`tests/dayClosure.integration.ps1` geçici SQL DB'de migration 001–013 uygular. Bozuk bildirim tablolarıyla gerçek admin/müşteri sipariş yazımı, ayar değişikliği, aktarım, takip onarıldıktan sonra toparlama, başarısız teslimde acknowledgement olmaması ve teslim sırasındaki değişikliğin sonraki kontrolde yakalanmasını test eder. Canlı DB'ye migration uygulanmadı.

`bash deploy/Test-Realtime-Linux.sh`

Geçici loopback servisinde gerçek SignalR handshake/yayın/Origin/auth/expiry/replay testi. Kalıcı servis kurmaz; Windows DB'ye bağlanmaz.

## Bağımlılık güvenliği

2026-10-05 npm audit, mevcut Next.js 16.3.4 için kritik next/og ImageResponse uyarısı ve geliştirme araçları için 6 yüksek uyarı döndürdü. SignalR paketiyle ilişkili bir uyarı bildirilmedi. Otomatik major downgrade veya audit fix --force yapılmadı. Üretime çıkmadan uygun patch güncellemesi ve tam regresyon gerekir; statik export olması tüm geliştirme/build risklerini kaldırmaz.
