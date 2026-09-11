// Yepas mobil — tohum veriler.
// Admin paneli (src/data/mockData.ts) ile bire bir aynı katalog ve müşteriler.
// Gerçek kurulumda bu veriler API'den gelecek.

import '../models/models.dart';

/// Bugün dağıtılacak (dün verilen) siparişlerin günü
const String kDeliveryDate = '9 Eylül 2026, Çarşamba';

/// Bugün verilen (yarın dağıtılacak) siparişlerin günü
const String kOrderDate = '10 Eylül 2026, Perşembe';

/// Sipariş alımının kapanma saati
const String kOrderCutoff = '17:30';

/// Maksimum sipariş adedi kuralı varsayılanları
const OrderRule kDefaultOrderRule = OrderRule.limit;
const int kDefaultMaxQty = 1200;

String _img(String file) => 'assets/urunler/$file';

const List<ProductCategory> kCategories = [
  ProductCategory(id: 'cat-gunluk', name: 'Günlük Ekmek', line: 'Tava Hattı · Fırın 1'),
  ProductCategory(id: 'cat-roll', name: 'Roll Ekmek', line: 'Otomatik Roll Hattı'),
  ProductCategory(id: 'cat-sandvic', name: 'Sandviç & Burger', line: 'Sandviç Hattı'),
  ProductCategory(id: 'cat-ozel', name: 'Geleneksel & Özel', line: 'Taş Fırın'),
];

final List<Product> kProducts = [
  // --- Günlük Ekmek ---
  Product(id: 'p01', categoryId: 'cat-gunluk', name: '3 Çizgili Üstü', code: 'EKM-301', maxOrderLimit: 600, avgOrder: 140, imageAsset: _img('9.jpg')),
  Product(id: 'p02', categoryId: 'cat-gunluk', name: 'Kepekli', code: 'EKM-302', maxOrderLimit: 400, avgOrder: 60, imageAsset: _img('2.jpg')),
  Product(id: 'p03', categoryId: 'cat-gunluk', name: 'Tam Buğday', code: 'EKM-303', maxOrderLimit: 300, avgOrder: 45, imageAsset: _img('3.jpg')),
  Product(id: 'p04', categoryId: 'cat-gunluk', name: 'Tava Ekmek', code: 'EKM-304', maxOrderLimit: 500, avgOrder: 90, imageAsset: _img('9.jpg')),
  // --- Roll Ekmek ---
  Product(id: 'p05', categoryId: 'cat-roll', name: 'Sade Roll', code: 'ROL-101', maxOrderLimit: 1200, avgOrder: 250, imageAsset: _img('1.jpg')),
  Product(id: 'p06', categoryId: 'cat-roll', name: 'Kepekli Roll', code: 'ROL-102', maxOrderLimit: 800, avgOrder: 120, imageAsset: _img('2.jpg')),
  Product(id: 'p07', categoryId: 'cat-roll', name: 'Tam Buğday Roll', code: 'ROL-103', maxOrderLimit: 800, avgOrder: 100, imageAsset: _img('3.jpg')),
  Product(id: 'p08', categoryId: 'cat-roll', name: 'Çavdarlı Roll', code: 'ROL-104', maxOrderLimit: 600, avgOrder: 80, imageAsset: _img('4.jpg')),
  Product(id: 'p09', categoryId: 'cat-roll', name: 'Tuzsuz Roll', code: 'ROL-105', maxOrderLimit: 400, avgOrder: 40, imageAsset: _img('5.jpg')),
  Product(id: 'p10', categoryId: 'cat-roll', name: 'Ayçekirdekli Roll', code: 'ROL-106', maxOrderLimit: 600, avgOrder: 70, imageAsset: _img('6.jpg')),
  // --- Sandviç & Burger ---
  Product(id: 'p11', categoryId: 'cat-sandvic', name: 'Susamlı Sandviç', code: 'SND-201', maxOrderLimit: 700, avgOrder: 130, imageAsset: _img('7.jpg')),
  Product(id: 'p12', categoryId: 'cat-sandvic', name: 'Susamlı Hamburger', code: 'SND-202', maxOrderLimit: 900, avgOrder: 180, imageAsset: _img('8.jpg')),
  Product(id: 'p13', categoryId: 'cat-sandvic', name: 'Cepli Pita', code: 'SND-203', maxOrderLimit: 500, avgOrder: 60, imageAsset: _img('12.jpg')),
  // --- Geleneksel & Özel ---
  Product(id: 'p14', categoryId: 'cat-ozel', name: 'Baston Somun', code: 'OZL-401', maxOrderLimit: 300, avgOrder: 55, imageAsset: _img('9.jpg')),
  Product(id: 'p15', categoryId: 'cat-ozel', name: 'Taş Fırın Köy Ekmeği', code: 'OZL-402', maxOrderLimit: 200, avgOrder: 35, imageAsset: _img('10.jpg')),
  Product(id: 'p16', categoryId: 'cat-ozel', name: 'Zeytinli & Otlu Ciabatta', code: 'OZL-403', maxOrderLimit: 250, avgOrder: 30, imageAsset: _img('11.jpg')),
  Product(id: 'p17', categoryId: 'cat-ozel', name: 'Ekşi Mayalı Somun', code: 'OZL-404', maxOrderLimit: 150, avgOrder: 18, imageAsset: _img('10.jpg')),
];

const List<Driver> kDrivers = [
  Driver(id: 'd1', code: 'SFR-01', name: 'Hakan Demir', phone: '0532 411 08 22', plate: '06 YPS 401', region: 'Kızılay · Ulus', pin: '1401'),
  Driver(id: 'd2', code: 'SFR-02', name: 'Mustafa Yılmaz', phone: '0533 260 77 14', plate: '06 YPS 118', region: 'Bahçelievler · Balgat', pin: '1118'),
  Driver(id: 'd3', code: 'SFR-03', name: 'Erkan Şahin', phone: '0542 815 33 90', plate: '06 YPS 232', region: 'Keçiören · Etlik', pin: '1232'),
  Driver(id: 'd4', code: 'SFR-04', name: 'Serkan Aydın', phone: '0505 774 12 63', plate: '06 YPS 305', region: 'Sincan · Etimesgut', pin: '1305'),
  Driver(id: 'd5', code: 'SFR-05', name: 'Bülent Koç', phone: '0536 903 45 71', plate: '06 YPS 417', region: 'Mamak · Natoyolu', pin: '1417'),
];

/// Demo giriş şifresi (tüm bayiler). Gerçekte sunucu tarafında doğrulanır.
const String _pw = '1234';

/// Birden çok şubesi olan demo vergi numarası → c01 / c06 / c11.
const String _multiTax = '1234567890';

const List<Customer> kCustomers = [
  // --- Aynı vergi numarasına bağlı 3 şubeli demo bayi (giriş: 1234567890 / 1234) ---
  Customer(id: 'c01', code: 'MI-1042', name: 'Bereket Market Kızılay', type: 'Market', district: 'Kızılay', contact: 'Ramazan Öz', phone: '0312 418 22 10', driverId: 'd1', stopNo: 1, taxNumber: _multiTax, branchNo: 1, password: _pw),
  Customer(id: 'c06', code: 'MI-2011', name: 'Öz Bahçelievler Market', type: 'Market', district: 'Bahçelievler', contact: 'Yalçın Er', phone: '0312 213 44 09', driverId: 'd2', stopNo: 1, taxNumber: _multiTax, branchNo: 2, password: _pw),
  Customer(id: 'c11', code: 'MI-3021', name: 'Etlik Gross Market', type: 'Market', district: 'Etlik', contact: 'Osman Duran', phone: '0312 325 41 06', driverId: 'd3', stopNo: 1, taxNumber: _multiTax, branchNo: 3, password: _pw),

  // --- Tek şubeli bayiler (her biri kendi vergi numarası) ---
  Customer(id: 'c02', code: 'MI-1043', name: 'Anafartalar Bakkaliye', type: 'Bakkal', district: 'Ulus', contact: 'Sevgi Tan', phone: '0312 310 55 04', driverId: 'd1', stopNo: 2, taxNumber: '3000000002', branchNo: 1, password: _pw),
  Customer(id: 'c03', code: 'MI-1044', name: 'Grand Ankara Otel', type: 'Otel', district: 'Kızılay', contact: 'Deniz Arel', phone: '0312 455 90 00', driverId: 'd1', stopNo: 3, taxNumber: '3000000003', branchNo: 1, password: _pw),
  Customer(id: 'c04', code: 'MI-1045', name: 'Sakarya Çorba & Kebap', type: 'Restoran', district: 'Sakarya', contact: 'Hüseyin Ak', phone: '0312 433 17 60', driverId: 'd1', stopNo: 4, taxNumber: '1111111111', branchNo: 1, password: _pw),
  Customer(id: 'c05', code: 'MI-1046', name: 'Kuğulu Kafe', type: 'Kafe', district: 'Kavaklıdere', contact: 'Ece Baran', phone: '0312 427 88 31', driverId: 'd1', stopNo: 5, taxNumber: '3000000005', branchNo: 1, password: _pw),
  Customer(id: 'c07', code: 'MI-2012', name: 'Emek Şarküteri', type: 'Bakkal', district: 'Emek', contact: 'Nurten Sarı', phone: '0312 215 76 22', driverId: 'd2', stopNo: 2, taxNumber: '3000000007', branchNo: 1, password: _pw),
  Customer(id: 'c08', code: 'MI-2013', name: 'Beşevler Öğrenci Yurdu', type: 'Kurum', district: 'Beşevler', contact: 'İlker Tunç', phone: '0312 222 10 40', driverId: 'd2', stopNo: 3, taxNumber: '3000000008', branchNo: 1, password: _pw),
  Customer(id: 'c09', code: 'MI-2014', name: 'Balgat Burger House', type: 'Restoran', district: 'Balgat', contact: 'Cem Kaya', phone: '0312 285 63 18', driverId: 'd2', stopNo: 4, taxNumber: '3000000009', branchNo: 1, password: _pw),
  Customer(id: 'c10', code: 'MI-2015', name: 'Söğütözü Plaza Kafeterya', type: 'Kafe', district: 'Söğütözü', contact: 'Melis Ün', phone: '0312 219 05 77', driverId: 'd2', stopNo: 5, taxNumber: '3000000010', branchNo: 1, password: _pw),
  Customer(id: 'c12', code: 'MI-3022', name: 'Kalaba Bakkaliye', type: 'Bakkal', district: 'Kalaba', contact: 'Hatice Gül', phone: '0312 359 62 88', driverId: 'd3', stopNo: 2, taxNumber: '3000000012', branchNo: 1, password: _pw),
  Customer(id: 'c13', code: 'MI-3023', name: 'Aktepe Yemek Fabrikası', type: 'Kurum', district: 'Aktepe', contact: 'Levent Bora', phone: '0312 380 77 12', driverId: 'd3', stopNo: 3, taxNumber: '3000000013', branchNo: 1, password: _pw),
  Customer(id: 'c14', code: 'MI-3024', name: 'Ovacık Pide & Lahmacun', type: 'Restoran', district: 'Ovacık', contact: 'Recep Sönmez', phone: '0312 336 24 51', driverId: 'd3', stopNo: 4, taxNumber: '3000000014', branchNo: 1, password: _pw),
  Customer(id: 'c15', code: 'MI-3025', name: 'Sanatoryum Kafe', type: 'Kafe', district: 'Etlik', contact: 'Buse Yıldız', phone: '0312 322 19 47', driverId: 'd3', stopNo: 5, taxNumber: '3000000015', branchNo: 1, password: _pw),
  Customer(id: 'c16', code: 'MI-4031', name: 'Sincan Halk Market', type: 'Market', district: 'Sincan', contact: 'Kadir Aslan', phone: '0312 271 33 90', driverId: 'd4', stopNo: 1, taxNumber: '3000000016', branchNo: 1, password: _pw),
  Customer(id: 'c17', code: 'MI-4032', name: 'Fatih Bakkaliye', type: 'Bakkal', district: 'Sincan', contact: 'Ayten Kurt', phone: '0312 276 18 25', driverId: 'd4', stopNo: 2, taxNumber: '3000000017', branchNo: 1, password: _pw),
  Customer(id: 'c18', code: 'MI-4033', name: 'Eryaman Catering Hizmetleri', type: 'Kurum', district: 'Eryaman', contact: 'Tolga Sezer', phone: '0312 280 66 34', driverId: 'd4', stopNo: 3, taxNumber: '3000000018', branchNo: 1, password: _pw),
  Customer(id: 'c19', code: 'MI-4034', name: 'Elvankent Kebap Salonu', type: 'Restoran', district: 'Elvankent', contact: 'Şükrü Balcı', phone: '0312 279 45 12', driverId: 'd4', stopNo: 4, taxNumber: '3000000019', branchNo: 1, password: _pw),
  Customer(id: 'c20', code: 'MI-4035', name: 'Etimesgut Bölge Hastanesi', type: 'Kurum', district: 'Etimesgut', contact: 'Dyt. Gamze Ok', phone: '0312 244 80 00', driverId: 'd4', stopNo: 5, taxNumber: '3000000020', branchNo: 1, password: _pw),
  Customer(id: 'c21', code: 'MI-5041', name: 'Natoyolu Mini Market', type: 'Market', district: 'Mamak', contact: 'Erhan Polat', phone: '0312 391 27 63', driverId: 'd5', stopNo: 1, taxNumber: '3000000021', branchNo: 1, password: _pw),
  Customer(id: 'c22', code: 'MI-5042', name: 'Akdere Bakkaliye', type: 'Bakkal', district: 'Akdere', contact: 'Mehmet Cin', phone: '0312 364 90 18', driverId: 'd5', stopNo: 2, taxNumber: '3000000022', branchNo: 1, password: _pw),
  Customer(id: 'c23', code: 'MI-5043', name: 'Mamak Belediyesi Aşevi', type: 'Kurum', district: 'Mamak', contact: 'Songül Ateş', phone: '0312 306 12 00', driverId: 'd5', stopNo: 3, taxNumber: '3000000023', branchNo: 1, password: _pw),
  Customer(id: 'c24', code: 'MI-5044', name: 'Gülveren Kahvaltı Evi', type: 'Kafe', district: 'Gülveren', contact: 'Fadime Şen', phone: '0312 370 51 29', driverId: 'd5', stopNo: 4, taxNumber: '3000000024', branchNo: 1, password: _pw),
];

OrderLine _l(String productId, int qty) => OrderLine(productId, qty);

/// Bugün verilen siparişler (yarın dağıtılacak) — müşteri bunları düzenler.
final List<DailyOrder> kDailyOrders = [
  DailyOrder(customerId: 'c01', status: OrderStatus.ordered, updatedAt: '07:42', lines: [_l('p01', 180), _l('p02', 40), _l('p05', 60)]),
  DailyOrder(customerId: 'c02', status: OrderStatus.ordered, updatedAt: '08:05', lines: [_l('p01', 60), _l('p04', 40)]),
  DailyOrder(customerId: 'c03', status: OrderStatus.ordered, updatedAt: '06:58', lines: [_l('p05', 400), _l('p06', 150), _l('p07', 100), _l('p16', 40)], note: 'Kahvaltı servisi erken başlıyor, teslimat 06:30 öncesi olmalı.'),
  DailyOrder(customerId: 'c04', status: OrderStatus.ordered, updatedAt: '09:12', lines: [_l('p11', 120), _l('p13', 60)]),
  DailyOrder(customerId: 'c05', status: OrderStatus.declined, updatedAt: '09:30', lines: [], note: 'Yarın tadilat nedeniyle kapalıyız.'),
  DailyOrder(customerId: 'c06', status: OrderStatus.ordered, updatedAt: '07:20', lines: [_l('p01', 220), _l('p02', 60), _l('p03', 35), _l('p14', 30)]),
  DailyOrder(customerId: 'c07', status: OrderStatus.pending, lines: []),
  DailyOrder(customerId: 'c08', status: OrderStatus.ordered, updatedAt: '08:44', lines: [_l('p05', 320), _l('p06', 180)]),
  DailyOrder(customerId: 'c09', status: OrderStatus.ordered, updatedAt: '10:02', lines: [_l('p12', 240), _l('p11', 90)]),
  DailyOrder(customerId: 'c10', status: OrderStatus.ordered, updatedAt: '08:15', lines: [_l('p16', 35), _l('p11', 50)]),
  DailyOrder(customerId: 'c11', status: OrderStatus.ordered, updatedAt: '07:05', lines: [_l('p01', 300), _l('p04', 120), _l('p02', 80)]),
  DailyOrder(customerId: 'c12', status: OrderStatus.declined, updatedAt: '08:50', lines: [], note: 'Bugünden devir stok fazlası var.'),
  DailyOrder(customerId: 'c13', status: OrderStatus.ordered, updatedAt: '06:40', lines: [_l('p05', 600), _l('p07', 200), _l('p09', 90)], note: 'Kasa iadesi: 12 boş kasa geri alınacak.'),
  DailyOrder(customerId: 'c14', status: OrderStatus.ordered, updatedAt: '09:48', lines: [_l('p13', 140), _l('p14', 45)]),
  DailyOrder(customerId: 'c15', status: OrderStatus.pending, lines: []),
  DailyOrder(customerId: 'c16', status: OrderStatus.ordered, updatedAt: '07:35', lines: [_l('p01', 260), _l('p02', 70), _l('p04', 100), _l('p15', 25)]),
  DailyOrder(customerId: 'c17', status: OrderStatus.declined, updatedAt: '09:05', lines: [], note: 'İşletme sahibi izinli, dükkân kapalı.'),
  DailyOrder(customerId: 'c18', status: OrderStatus.ordered, updatedAt: '06:30', lines: [_l('p05', 480), _l('p06', 220), _l('p12', 300)], note: 'Fabrika servisi — sabah 05:00 kapı teslim.'),
  DailyOrder(customerId: 'c19', status: OrderStatus.ordered, updatedAt: '10:20', lines: [_l('p13', 90), _l('p12', 160)]),
  DailyOrder(customerId: 'c20', status: OrderStatus.ordered, updatedAt: '07:58', lines: [_l('p09', 260), _l('p06', 140), _l('p03', 60)], note: 'Diyet mutfağı için tuzsuz ürünler ayrı kasada gönderilecek.'),
  DailyOrder(customerId: 'c21', status: OrderStatus.ordered, updatedAt: '08:30', lines: [_l('p01', 90), _l('p04', 60)]),
  DailyOrder(customerId: 'c22', status: OrderStatus.declined, updatedAt: '09:22', lines: []),
  DailyOrder(customerId: 'c23', status: OrderStatus.ordered, updatedAt: '07:12', lines: [_l('p01', 420), _l('p14', 80), _l('p15', 40)]),
  DailyOrder(customerId: 'c24', status: OrderStatus.pending, lines: []),
];

/// Dün verilen (bugün dağıtılacak) siparişler — kesinleşmiş, salt-okunur.
/// kDailyOrders'tan deterministik olarak türetilir.
final List<OrderLine> _fallbackLines = [_l('p01', 120), _l('p05', 90), _l('p04', 40)];

final List<DailyOrder> kDeliveryOrders = () {
  final result = <DailyOrder>[];
  for (var i = 0; i < kDailyOrders.length; i++) {
    final order = kDailyOrders[i];
    if (order.status == OrderStatus.pending) {
      result.add(DailyOrder(
        customerId: order.customerId,
        status: OrderStatus.ordered,
        updatedAt: '16:40',
        lines: _fallbackLines.map((l) => l.copyWith()).toList(),
      ));
    } else if (order.status == OrderStatus.declined) {
      result.add(order.copyWith(lines: []));
    } else {
      final factor = 0.82 + (i % 5) * 0.06;
      result.add(order.copyWith(
        lines: order.lines
            .map((l) => l.copyWith(qty: (((l.qty * factor) / 5).round() * 5).clamp(10, 1 << 30)))
            .toList(),
      ));
    }
  }
  return result;
}();
