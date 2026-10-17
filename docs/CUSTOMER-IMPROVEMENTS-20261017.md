# Müşteri iyileştirme talepleri — 2026-10-17

Durum: kapsam onaylandı; hesap, parola, oturum ve sipariş notu değişiklikleri kaynakta uygulandı.
0.6.2-rc.1 sunucuya kuruldu, migration 014 uygulandı ve canlı admin güncellemesi
kullanıcı tarafından doğrulandı. Hesap/PIN/not değişiklikleri yerel testlerden geçti;
bu ekranların gerçek sunucu kabul testleri ve mobil uçtan uca test hâlâ bekliyor.
0.6.0-rc.1 paketi kurulmayacak; canlı güncelleme ve kabul edilen iyileştirmeler
test edildikten sonra birlikte yeni paket yapılacak. Public DNS/dış erişim ertelendi.

## Talepler

1. Müşteri parolası tam 4 ASCII rakam. Baştaki sıfırlar korunacak; hash/salt saklama devam edecek.
2. Müşteri parola geçerlilik süresi olmayacak. Mevcut kodun 7 günlük geçici parola süresi kaldırılacak.
3. Yönetici müşteri kullanıcı adını değiştirebilecek. Benzersizlik, boşluk reddi, audit ve açık oturumların iptali kontrol edilecek.
4. Şirket/şahıs için vergi no veya TCKN tabanlı giriş; şubeler için numara/şubeadı,
   şubesiz müşteri için yalnız numara. Yerel kopyada ayrı TCKN kolonu bulunmadı;
   `VERGI_NO` geçerliyse önerilir, eksikse yönetici doğrulayarak girer. Yalnız biçim
   doğrulanır; numaranın hukuki sahipliği veya TCKN doğrulama servisi kapsam dışıdır.
   Mevcut kullanıcı adları sessizce toplu değiştirilmeyecek. Şube bazlı ayrı hesap ile
   aynı hesapta çoklu şube erişimi korunması kullanıcı tarafından onaylandı.
   Ortak hesapta yalnız numara, tek şube hesabında isteğe bağlı numara/şubeadı önerilir;
   kullanıcı adı şube yetkisini belirlemez, CustomerAccess belirler.
5. Mevcut şube tiki CustomerAccess erişim eşlemesidir; aynı müşterinin seçili şubeleri
   aynı hesabın erişimine açılır. Siparişler şube bazında ayrı kalır. Başka hesaba bağlı
   şube seçilemez. Form halen hesapsız şubeleri başlangıçta topluca seçmektedir.
6. Personel parolası tam 2 ASCII rakam. Mevcut uygulamada personel paneli DRIVER/şoför
   paneli olarak yorumlanıyor; ayrı bir personel rolü istendiği varsayılmayacak.
7. Personel parola geçerlilik süresi olmayacak.
8. Personel zorunlu parola değiştirme ekranına gönderilmeyecek.
9. Admin ve personel için süre/boşta kalma nedeniyle otomatik çıkış istenmiyor.
   Açık çıkış, hesap kapatma, parola sıfırlama ve yetki iptalinde oturum iptali korunmalı.
   SignalR kısa ömürlü bileti ana oturumdan ayrıdır, kısa ömürlü kalmalı ve yenilenmeli.
   Tarayıcı çerez silme/cihaz kaybı gibi dış nedenlere karşı 'hiç çıkmaz' garantisi verilemez.
10. Mobil uygulama yardım/iletişim ikonları ve kişi listesi: kullanıcının 'uygulama hakkında
    olanları boşver' ifadesi nedeniyle maddenin tamamı kapsam dışı; kullanıcı teyit etti.
11. Mobil ilk liste görünümü mobilciye ait. Sipariş notunun API'de kaydı ve şoför portalında
    gösterimi onaylandı. Mevcut `note` alanı en fazla 500 karakter alır, şube/sipariş
    yetkisi, revizyon/idempotency, iptal ve gün kapanışı kuralları korunur. Şoförde
    not düz metin ve satır sonlarıyla görünür, HTML çalıştırılmaz. Admin miktar
    düzenlerken müşterinin notunu artık null göndererek silmez.

## Uygulama/geçiş ayrıntıları

- Migration 014: AuthSessions.ExpiresAtUtc nullable; yalnız halen geçerli ve iptal
  edilmemiş ADMIN/DRIVER oturumları süresiz yapılır. Süresi bitmiş/iptal edilmiş
  oturumlar diriltilmez. CUSTOMER oturumunun 8 saat sınırı korunur.
- Admin/şoför çerezi HttpOnly/Secure/SameSite.Strict olarak kalıcı yazılır;
  tarayıcı sınırları nedeniyle 365 günlük son kullanma tarihi /auth/me ile yenilenir.
  Sunucuda bu rollerin oturumuna süre sınırı yoktur; cihazın çerezi silmesi veya çok
  uzun süre kullanılmaması gibi dış nedenlere karşı sonsuz giriş garantisi yoktur.
- Müşteri ilk giriş/parola sıfırlama sonrası parola değiştirme zorunluluğu korunur;
  kaldırılan şey 7 günlük geçerlilik süresidir. Şoförde ikisi de kaldırılır.
- PUT /api/v1/admin/customers/accounts/{userId}/login-name yalnız yetkili admin ve
  tek CUSTOMER rollü hesap için çalışır; ad benzersizliği, audit, açık oturum iptali
  aynı transaction içindedir. Mevcut şube erişimleri korunur.
- Testler: tests/accounts.integration.ps1 (GUID test DB),
  tests/dayClosure.integration.ps1 (not oluşturma/güncelleme/şoför okuma dahil),
  tests/customerAccount.test.mjs ve tests/driverPin.test.mjs.

## Güvenlik ve geçiş

- İki rakam 100, dört rakam 10.000 olasılıktır. Başarısız giriş/deneme sınırı ve
  erişim iptali korunmalı; public açılış öncesi düşük PIN entropisi riski değerlendirilmelidir.
- Kullanıcı parolaları geri çözülemeyen özetlerle saklanır. Eski parolalar kesilemez,
  otomatik dönüştürülemez veya herkese ortak varsayılan PIN atanamaz. Uymayan hesaplara
  yönetici tarafından yeni parola belirleme geçişi gereklidir.
- Admin güçlü parola kuralı PIN'e düşürülmeyecek. Müşteri/parola süresi, ana oturum
  süresi ve SignalR bilet süresi ayrı politikalardır.
- Windows 7/.NET Framework 4.8 ve SQL Server 2005 uyumluluğu korunmalı; mevcut
  kimlik/şube yetkisi arıza izolasyonu testlerine yeni kombinasyonlar eklenmeli.
