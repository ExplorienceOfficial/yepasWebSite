# Kritik akış test kapsamı

## Otomatik ve veritabanından bağımsız

`Yepas.PolicyTests` toplam 30 senaryo çalıştırır:

- 11 sipariş penceresi/SG, kesim saati ve manuel durum kontrolü.
- 4 ürün adından paket büyüklüğü çıkarımı.
- 11 sipariş satırı kontrolü: tanımlı ürün/varyant, tekrar, müşteri limiti,
  sıfır miktar, 5'li paket katı, boş gönderim ve iptal/ürün istemiyorum.
- 4 manuel/00:01 otomatik aktarım hedef günü ve gece sınırı kontrolü.

Çalıştırma:

```powershell
& 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\MSBuild\Current\Bin\MSBuild.exe' '.\server\Yepas.PolicyTests\Yepas.PolicyTests.csproj' /t:Rebuild /p:Configuration=Release
& '.\server\Yepas.PolicyTests\bin\Release\Yepas.PolicyTests.exe'
```

Bu senaryolar yalnızca saf iş kurallarını test eder; bir siparişin veritabanına
yazıldığını veya eski fişe doğru aktarıldığını **kanıtlamaz**.

## SQL Server 2005 test VM'sinde entegrasyon

Müşteri, VM üzerindeki `EkmekSiparis` ve `PrestoPlus` veritabanlarının test amaçlı
olduğunu teyit etti. Testler yalnız önceden belirlenen sipariş/şube üzerinde
çalıştırılmalı; sorguların etkileyeceği diğer kayıtlar önce kontrol edilmelidir.

29 Eylül 2026 tarihinde `0.4.0` smoke sürümünde elle doğrulananlar:

- Admin `MB 1592` için `OrderId 8` oluşturdu; ara tabloda `PENDING`, eski fiş yoktu.
- İlk aktarım `1683564 / U-1` mobil fişini oluşturdu.
- Admin güncellemesi ve tekrar aktarım aynı fişi güncelledi; mükerrer fiş olmadı.
- `customer-flow-test.py`, müşteri girişi/şube yetkisi, idempotency tekrarı ve
  çakışması ile eski revizyon reddini doğruladı. Sonrasında aynı fişe tekrar
  aktarım başarılı oldu.
- 30 Eylül 00:01 otomatik görevini test etmek için `OrderId 8` miktarı 3 olarak
  `PENDING` bırakıldı; sonucun doğrulanması bekleniyor.

Henüz otomatik entegrasyon testine dönüşmeyen senaryolar:

1. Müşteri PUT: ilk sipariş `Orders` + `OrderLines` + `OrderAudit` oluşturur;
   aynı `Idempotency-Key` tekrarında ikinci kayıt açılmaz, farklı gövdede hata.
2. Aynı şubede yeni revizyon satırları değiştirir; eski revizyon reddedilir;
   başka şube ve gün değişmez.
3. Kesim saati ve manuel kapalıyken müşteri yazamaz; admin yetkisi, müşteri
   şube yetkisi ve şoför kapsamı sunucuda uygulanır.
4. İlk manuel aktarım yalnız yarın teslimli bekleyen mobil siparişleri
   `RS_FIS_BILGILERI` ve `RS_FIS_SATIRLARI` tablolarına yazar.
5. Aktarılmış sipariş güncellenip tekrar aktarıldığında aynı mobil fiş ID'si
   korunur, yalnız o fişin satırları yenilenir; eski programın MOBIL olmayan
   fişleri ve diğer müşterilerin fişleri değişmez.
6. İptal/ürün istemiyorum sonrası tekrar aktarım, sadece ilişkili mobil fişi
   doğru biçimde temizler; tekrar çağrı mükerrer fiş açmaz.
7. Salı 00:01 görevi Pazartesi oluşturulup Salı teslim edilen bekleyenleri
   aktarır; ikinci çalıştırma mükerrerlik yaratmaz; dünün fişleri değişmez.
8. İki veritabanından biri kullanılamazsa hata kaydı ve yeniden deneme
   davranışı doğrulanır; kısmi aktarım sonrasında güvenli toparlanma denenir.

Yukarıdaki elle doğrulamalar değerli olsa da bu maddeler otomatik çalışır ve
tekrarlanabilir hale gelmeden tam otomatik uçtan uca kapsam var denmemelidir.
