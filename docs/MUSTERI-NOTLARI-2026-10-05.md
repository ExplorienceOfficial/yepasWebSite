# Müşteri notları — 5 Ekim 2026

Bu değişiklikler mevcut EkmekSiparis / PrestoPlus tablolarını değiştirmez; yeni migration yok.

## Uygulananlar

- Açma/kapama sonucunda anahtar ve üst rozet API cevabından güncellenir; eski okuma
  cevabı kaydetme sonucunu ezemez. Hata durumunda önceki anahtar durumu korunur.
- Mobil API `displayCutoffTime`: etkin manuel modda `00:00`, otomatik modda kayıtlı saat.
  Gerçek cutoff ve kabul politikası değişmez. Mobil arayüzü mobilci güncellemelidir.
- Müşteriler sayfasındaki üst mavi hesap açma düğmesi kaldırıldı; şubedeki hesap açma korunur.
- Kullanıcı adında boşluk kabul edilmez. Parolalar aynen korunur.
- Admin hesap oluşturma hataları: `LOGIN_NAME_IN_USE` ve `BRANCH_ALREADY_LINKED` ayrıdır.
  Eşzamanlı diğer SQL benzersizlik çatışmaları genel güvenli mesajla döner.
- Giriş adresleri: `/login/admin/` ve `/login/sofor/`. `/` adresi şoför girişini gösterir.
  Web API uçları: `auth/admin/login` ve `auth/driver/login`; rol sunucuda sabitlenir.
  Mobil `auth/login` sözleşmesi korunur. Ortak oturum cookie'si nedeniyle aynı tarayıcı
  profilinde iki rol eşzamanlı kullanılamaz; ayrı profil/gizli pencere kullanın.
- Admin sipariş detayları, düzenleme ürünleri ve şoför ekranı üst stok / alt varyant kırılımında.
- Şoför filtreleri yalnız `Bugün dağıtılacak` ve `Yarın dağıtılacak` olarak gösterilir; verilme günü etiketi yoktur.
  Varsayılan seçimin ve API kapsamlarının davranışı bu etiket düzeltmesinde değiştirilmedi.
  Teslim tarihi SQL saatinden hesaplanır ve takvim tarihi olarak gösterilir; kör +1 uygulanmaz.

## Sonraki aşama

Saat sınırı düzeltmesi: `nextStatusChangeAtUtc` backend tarafından SQL saati
ve güncel ayardan hesaplanır. Üst bar tek bir zamanlayıcıyla bu sınırda
durumu yeniden doğrular; anahtar ve rozet aynı onaylı cevapla güncellenir.
Kaydedilen yeni saat eski zamanlayıcıyı iptal eder. Süresiz manuel modda
zamanlayıcı yoktur; süreli manuel mod bitişi ve AUTO gece yarısı takip edilir.
Pencereye/sekme görünürlüğüne dönüşte durum tekrar okunur; periyodik polling
eklenmedi. Bağlantı hatasında kapalı/açık tahmini yapılmaz, durum bilinmiyor
gösterilir. Başka cihazdan yapılan değişiklikler için anlık push/SSE hizmeti
hala ayrı iştir; bu zamanlayıcı onu sağlamaz.

Ek düzeltme: standart ve her alt kırılım artık kendi ürün kartıdır; üst ürün adı
her kartta, kırılım adı alt satırda ve miktar ayrı gösterilir. Düzenleme listesi
de aynı şekilde her üst/alt stok çiftini bağımsız gösterir. Giriş ekranları
birbirlerine bağlantı vermez. Bu bir arayüz ayrımıdır; yönetici URL'sinin
gizliliği güvenlik sınırı değildir, API rol doğrulaması korunur.

Şoför hesap oluşturma/yenileme ve ilk girişte parola değiştirme tam 4 ASCII
rakam kabul eder; baştaki sıfır korunur. Yönetici ve müşteri 12–128 karakter
kuralı değişmez. PIN hash/salt ile tutulur, 5 başarısız girişte 15 dakika
kilit korunur. 4 rakamın yalnız 10.000 kombinasyonu vardır; güçlü parola
ile aynı güvenlik seviyesinde değildir. Mevcut şoför parolaları otomatik
değişmez: yeni giriş ekranı için admin bunları 4 rakamla yenilemelidir.

Üretim derlemesi Webpack ile doğrulandı. Bu bilgisayardaki Turbopack alt süreç hatası
nedeniyle paket oluştururken `New-SmokePackage.ps1 -Version 0.5.6-smoke-rc -BuildEngine webpack`
kullanılabilir; uygulamanın runtime gereksinimleri değişmez.

Sunucu kabul testleri ve mobil arayüz güncellemesi gerekir. Linux canlı bildirim servisi
bu paketin kapsamında değildir; başka kullanıcıdan anlık olayların ekrana düşmesi henüz eklenmedi.
