// Yepas mobil — API v1 veri modelleri (openapi.yaml sözleşmesi).
// Fiyat alanı yoktur; ürün anahtarı uStokId + aStokId ikilisidir (README §3).

int _int(dynamic v) => v is int ? v : (v is num ? v.toInt() : int.parse('$v'));
int? _intOrNull(dynamic v) => v == null ? null : _int(v);
String _str(dynamic v) => v == null ? '' : '$v';
String? _strOrNull(dynamic v) => v == null ? null : '$v';
DateTime _date(dynamic v) => DateTime.parse('$v');
DateTime? _dateOrNull(dynamic v) => v == null ? null : DateTime.parse('$v');

/// Sipariş durumları (README §5).
enum OrderStatus {
  submitted, // SUBMITTED — en az bir ürün satırı olan aktif sipariş
  noProduct, // NO_PRODUCT — müşteri bu teslimat için ürün istemiyor
  cancelled; // CANCELLED — daha önceki sipariş iptal edildi

  String get wire => switch (this) {
        OrderStatus.submitted => 'SUBMITTED',
        OrderStatus.noProduct => 'NO_PRODUCT',
        OrderStatus.cancelled => 'CANCELLED',
      };

  static OrderStatus fromWire(String? s) => switch (s) {
        'NO_PRODUCT' => OrderStatus.noProduct,
        'CANCELLED' => OrderStatus.cancelled,
        _ => OrderStatus.submitted,
      };
}

/// Aktif mobil kullanıcı (GET /auth/me, LoginResponse tabanı).
class Identity {
  final int userId;
  final String loginName;
  final String role; // CUSTOMER
  final int? legacyPersonnelId;
  final bool mustChangePassword;

  const Identity({
    required this.userId,
    required this.loginName,
    required this.role,
    required this.legacyPersonnelId,
    required this.mustChangePassword,
  });

  factory Identity.fromJson(Map<String, dynamic> j) => Identity(
        userId: _int(j['userId']),
        loginName: _str(j['loginName']),
        role: _str(j['role']),
        legacyPersonnelId: _intOrNull(j['legacyPersonnelId']),
        mustChangePassword: j['mustChangePassword'] == true,
      );

  Identity copyWith({bool? mustChangePassword}) => Identity(
        userId: userId,
        loginName: loginName,
        role: role,
        legacyPersonnelId: legacyPersonnelId,
        mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      );
}

/// Başarılı giriş yanıtı — kimlik + sekiz saatlik opaque token.
class LoginResult {
  final Identity identity;
  final String accessToken;

  const LoginResult({required this.identity, required this.accessToken});

  factory LoginResult.fromJson(Map<String, dynamic> j) => LoginResult(
        identity: Identity.fromJson(j),
        accessToken: _str(j['accessToken']),
      );

  bool get mustChangePassword => identity.mustChangePassword;
}

/// Müşteri hesabına bağlı bir şube (GET /customer/branches).
class CustomerBranch {
  final int legacyMbId;
  final int legacyCustomerId;
  final int legacyDepartmentId;
  final int legacyPersonnelId;
  final String customerCode;
  final String customerName;
  final String departmentName;
  final String taxNumber;
  final String personnelName;
  final String distributionDays;

  const CustomerBranch({
    required this.legacyMbId,
    required this.legacyCustomerId,
    required this.legacyDepartmentId,
    required this.legacyPersonnelId,
    required this.customerCode,
    required this.customerName,
    required this.departmentName,
    required this.taxNumber,
    required this.personnelName,
    required this.distributionDays,
  });

  factory CustomerBranch.fromJson(Map<String, dynamic> j) => CustomerBranch(
        legacyMbId: _int(j['legacyMbId']),
        legacyCustomerId: _int(j['legacyCustomerId']),
        legacyDepartmentId: _int(j['legacyDepartmentId']),
        legacyPersonnelId: _int(j['legacyPersonnelId']),
        customerCode: _str(j['customerCode']),
        customerName: _str(j['customerName']),
        departmentName: _str(j['departmentName']),
        taxNumber: _str(j['taxNumber']),
        personnelName: _str(j['personnelName']),
        distributionDays: _str(j['distributionDays']),
      );
}

/// Sipariş penceresi durumu (README §3).
class OrderWindow {
  final bool isOpen;
  final String mode; // AUTO | OPEN | CLOSED
  final int cutoffMinute; // gün içi dakika (0-1439)
  final DateTime? deadlineUtc;
  final DateTime? overrideUntilUtc;

  const OrderWindow({
    required this.isOpen,
    required this.mode,
    required this.cutoffMinute,
    required this.deadlineUtc,
    required this.overrideUntilUtc,
  });

  factory OrderWindow.fromJson(Map<String, dynamic> j) => OrderWindow(
        isOpen: j['isOpen'] == true,
        mode: _str(j['mode']),
        cutoffMinute: _int(j['cutoffMinute']),
        deadlineUtc: _dateOrNull(j['deadlineUtc']),
        overrideUntilUtc: _dateOrNull(j['overrideUntilUtc']),
      );
}

/// Sipariş edilebilir ürün. Fiyat içermez (README §3).
class Product {
  final int uStokId;
  final int aStokId;
  final String code;
  final String name;
  final int groupId;
  final String? variantName;
  final int maxQuantity; // 0 → üst sınır yok

  const Product({
    required this.uStokId,
    required this.aStokId,
    required this.code,
    required this.name,
    required this.groupId,
    required this.variantName,
    required this.maxQuantity,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        uStokId: _int(j['uStokId']),
        aStokId: _int(j['aStokId']),
        code: _str(j['code']),
        name: _str(j['name']),
        groupId: _int(j['groupId']),
        variantName: _strOrNull(j['variantName']),
        maxQuantity: _int(j['maxQuantity']),
      );

  /// uStokId + aStokId ikilisinin benzersiz taslak anahtarı.
  String get key => '$uStokId:$aStokId';

  String get displayName => (variantName != null && variantName!.trim().isNotEmpty)
      ? '$name · $variantName'
      : name;

  bool get unlimited => maxQuantity <= 0;

  /// Girilebilecek en yüksek adet. Sınırsızsa openapi üst sınırı (100000).
  int get cap => unlimited ? 100000 : maxQuantity;
}

/// PUT gövdesindeki tek satır (OrderLineInput).
class OrderLineInput {
  final int uStokId;
  final int aStokId;
  final int quantity;

  const OrderLineInput({
    required this.uStokId,
    required this.aStokId,
    required this.quantity,
  });

  Map<String, dynamic> toJson() =>
      {'uStokId': uStokId, 'aStokId': aStokId, 'quantity': quantity};
}

/// Kaydedilmiş sipariş satırı (ürün adı sunucudan gelir).
class OrderLine {
  final int uStokId;
  final int aStokId;
  final int quantity;
  final String productCode;
  final String productName;
  final String? variantName;

  const OrderLine({
    required this.uStokId,
    required this.aStokId,
    required this.quantity,
    required this.productCode,
    required this.productName,
    required this.variantName,
  });

  factory OrderLine.fromJson(Map<String, dynamic> j) => OrderLine(
        uStokId: _int(j['uStokId']),
        aStokId: _int(j['aStokId']),
        quantity: _int(j['quantity']),
        productCode: _str(j['productCode']),
        productName: _str(j['productName']),
        variantName: _strOrNull(j['variantName']),
      );

  String get key => '$uStokId:$aStokId';

  String get displayName => (variantName != null && variantName!.trim().isNotEmpty)
      ? '$productName · $variantName'
      : productName;
}

/// Kaydedilmiş sipariş (GET/PUT yanıtı).
class Order {
  final int orderId;
  final int legacyMbId;
  final DateTime deliveryDate; // takvim günü — saat dilimi dönüşümü yapılmaz
  final OrderStatus status;
  final int revision;
  final String? note;
  final DateTime updatedAtUtc;
  final List<OrderLine> lines;

  const Order({
    required this.orderId,
    required this.legacyMbId,
    required this.deliveryDate,
    required this.status,
    required this.revision,
    required this.note,
    required this.updatedAtUtc,
    required this.lines,
  });

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        orderId: _int(j['orderId']),
        legacyMbId: _int(j['legacyMbId']),
        deliveryDate: _date(j['deliveryDate']),
        status: OrderStatus.fromWire(j['status'] as String?),
        revision: _int(j['revision']),
        note: _strOrNull(j['note']),
        updatedAtUtc: _date(j['updatedAtUtc']),
        lines: ((j['lines'] as List?) ?? const [])
            .map((e) => OrderLine.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  int get units => lines.fold(0, (sum, l) => sum + l.quantity);
}

/// PUT /customer/branches/{legacyMbId}/order gövdesi (SaveOrderRequest).
class SaveOrderRequest {
  final int? revision; // yeni siparişte 0/null
  final OrderStatus status;
  final String? note;
  final List<OrderLineInput> lines;

  const SaveOrderRequest({
    required this.revision,
    required this.status,
    required this.note,
    required this.lines,
  });

  Map<String, dynamic> toJson() => {
        'revision': revision,
        'status': status.wire,
        'note': note,
        'lines': lines.map((l) => l.toJson()).toList(),
      };
}

/// Sipariş bağlamı (GET /customer/branches/{legacyMbId}/order).
class CustomerOrderContext {
  final int legacyMbId;
  final DateTime deliveryDate;
  final OrderWindow window;
  final List<Product> products;
  final Order? order;

  const CustomerOrderContext({
    required this.legacyMbId,
    required this.deliveryDate,
    required this.window,
    required this.products,
    required this.order,
  });

  factory CustomerOrderContext.fromJson(Map<String, dynamic> j) =>
      CustomerOrderContext(
        legacyMbId: _int(j['legacyMbId']),
        deliveryDate: _date(j['deliveryDate']),
        window: OrderWindow.fromJson(j['window'] as Map<String, dynamic>),
        products: ((j['products'] as List?) ?? const [])
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList(),
        order: j['order'] == null
            ? null
            : Order.fromJson(j['order'] as Map<String, dynamic>),
      );

  CustomerOrderContext copyWith({Order? order}) => CustomerOrderContext(
        legacyMbId: legacyMbId,
        deliveryDate: deliveryDate,
        window: window,
        products: products,
        order: order ?? this.order,
      );
}
