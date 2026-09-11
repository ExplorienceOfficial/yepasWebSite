// Yepas mobil — veri modelleri (admin panelindeki src/types ile aynı sözleşme)

enum OrderStatus { ordered, declined, pending }

/// Maksimum sipariş adedi kuralı: sabit limit mi yoksa geçmiş ortalama mı?
enum OrderRule { limit, average }

class ProductCategory {
  final String id;
  final String name;

  /// Üretim hattı / fırın grubu bilgisi
  final String line;

  const ProductCategory({required this.id, required this.name, required this.line});
}

class Product {
  final String id;
  final String categoryId;

  /// Alt varyasyon adı: "3 Çizgili Üstü", "Kepekli" ...
  final String name;
  final String code;

  /// Bir müşterinin tek seferde geçebileceği maksimum adet
  final int maxOrderLimit;

  /// Geçmiş ortalama sipariş adedi
  final int avgOrder;

  /// Asset yolu, örn. assets/urunler/9.jpg
  final String imageAsset;

  const Product({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.code,
    required this.maxOrderLimit,
    required this.avgOrder,
    required this.imageAsset,
  });
}

class Driver {
  final String id;
  final String code;
  final String name;
  final String phone;
  final String plate;
  final String region;

  /// Şoför portalına giriş için 4 haneli PIN (demo)
  final String pin;

  const Driver({
    required this.id,
    required this.code,
    required this.name,
    required this.phone,
    required this.plate,
    required this.region,
    required this.pin,
  });
}

class Customer {
  final String id;
  final String code;
  final String name;
  final String type; // Market | Bakkal | Restoran | Kafe | Otel | Kurum
  final String district;
  final String contact;
  final String phone;
  final String driverId;

  /// Teslimat sırası (rota içindeki durak no)
  final int stopNo;

  /// Giriş için vergi numarası. Aynı vergi no birden çok şubede olabilir.
  final String taxNumber;

  /// Şube numarası — aynı vergi no altındaki bayiyi ayırt eder.
  final int branchNo;

  /// Giriş şifresi (demo). Gerçekte sunucu tarafında doğrulanmalı.
  final String password;

  const Customer({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.district,
    required this.contact,
    required this.phone,
    required this.driverId,
    required this.stopNo,
    required this.taxNumber,
    required this.branchNo,
    required this.password,
  });
}

class OrderLine {
  final String productId;
  final int qty;

  const OrderLine(this.productId, this.qty);

  OrderLine copyWith({int? qty}) => OrderLine(productId, qty ?? this.qty);
}

class DailyOrder {
  final String customerId;
  final OrderStatus status;
  final List<OrderLine> lines;

  /// Son giriş / güncelleme saati (HH:mm) — pending ise null
  final String? updatedAt;
  final String? note;

  /// Admin tarafından elle düzenlendi mi
  final bool editedByAdmin;

  const DailyOrder({
    required this.customerId,
    required this.status,
    required this.lines,
    this.updatedAt,
    this.note,
    this.editedByAdmin = false,
  });

  int get units => lines.fold(0, (sum, l) => sum + l.qty);

  DailyOrder copyWith({
    OrderStatus? status,
    List<OrderLine>? lines,
    String? updatedAt,
    String? note,
    bool? editedByAdmin,
  }) {
    return DailyOrder(
      customerId: customerId,
      status: status ?? this.status,
      lines: lines ?? this.lines,
      updatedAt: updatedAt ?? this.updatedAt,
      note: note ?? this.note,
      editedByAdmin: editedByAdmin ?? this.editedByAdmin,
    );
  }
}
