// Yepas mobil — uygulama durumu.
// Admin panelindeki OperationsContext'in müşteri tarafını taşır:
// sipariş kuralı (limit/ortalama), kesim saati, sistem açık/kapalı, sipariş girişi.

import 'package:flutter/widgets.dart';

import '../data/seed_data.dart';
import '../models/models.dart';

class AppState extends ChangeNotifier {
  // ---- katalog / statik veri ----
  final List<ProductCategory> categories = kCategories;
  final List<Product> products = kProducts;
  final List<Customer> customers = kCustomers;
  final List<Driver> drivers = kDrivers;

  // ---- sistem ayarları (admin tarafından belirlenir) ----
  bool orderSystemOpen = true;
  OrderRule orderRule = kDefaultOrderRule;
  int maxQtyLimit = kDefaultMaxQty;
  String cutoffTime = kOrderCutoff;

  // ---- oturum ----
  String? currentCustomerId;

  // ---- sipariş verileri ----
  late final Map<String, DailyOrder> _orders;
  late final Map<String, DailyOrder> _deliveryOrders; // bugün teslim — salt okunur

  AppState() {
    _orders = {for (final o in kDailyOrders) o.customerId: o};
    _deliveryOrders = {for (final o in kDeliveryOrders) o.customerId: o};
  }

  // ---------------------------------------------------------------- seçiciler

  Customer? get currentCustomer =>
      currentCustomerId == null ? null : customerById(currentCustomerId!);

  Customer? customerById(String id) {
    for (final c in customers) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// Bir vergi numarasına bağlı tüm şubeler (şube no'ya göre sıralı).
  List<Customer> branchesForTax(String taxNumber) {
    final norm = taxNumber.trim();
    final list = customers.where((c) => c.taxNumber == norm).toList();
    list.sort((a, b) => a.branchNo.compareTo(b.branchNo));
    return list;
  }

  Product? productById(String id) {
    for (final p in products) {
      if (p.id == id) return p;
    }
    return null;
  }

  Driver? driverById(String id) {
    for (final d in drivers) {
      if (d.id == id) return d;
    }
    return null;
  }

  ProductCategory categoryById(String id) =>
      categories.firstWhere((c) => c.id == id);

  List<Product> productsInCategory(String categoryId) =>
      products.where((p) => p.categoryId == categoryId).toList();

  DailyOrder? orderFor(String customerId) => _orders[customerId];
  DailyOrder? deliveryFor(String customerId) => _deliveryOrders[customerId];

  /// Aktif kurala göre bir ürünün üst sınırı.
  int maxQtyFor(String productId) {
    final p = productById(productId);
    if (p == null) return 0;
    return orderRule == OrderRule.average
        ? p.avgOrder
        : (p.maxOrderLimit < maxQtyLimit ? p.maxOrderLimit : maxQtyLimit);
  }

  // ---------------------------------------------------------------- oturum

  /// Seçilen şubenin şifresini doğrular ve oturumu açar. Şifre yanlışsa false.
  bool loginWith(Customer branch, String password) {
    if (branch.password != password) return false;
    currentCustomerId = branch.id;
    notifyListeners();
    return true;
  }

  void logout() {
    currentCustomerId = null;
    notifyListeners();
  }

  // ---------------------------------------------------------------- aksiyonlar

  String _clock() {
    final now = DateTime.now();
    final h = now.hour.toString().padLeft(2, '0');
    final m = now.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  /// Müşteri siparişini kaydeder. Adetler aktif kurala göre kırpılır.
  void submitOrder(String customerId, Map<String, int> draft) {
    final lines = <OrderLine>[];
    draft.forEach((productId, qty) {
      if (qty <= 0) return;
      final capped = qty.clamp(0, maxQtyFor(productId));
      if (capped > 0) lines.add(OrderLine(productId, capped));
    });

    final existing = _orders[customerId];
    _orders[customerId] = (existing ??
            DailyOrder(customerId: customerId, status: OrderStatus.pending, lines: const []))
        .copyWith(
      status: OrderStatus.ordered,
      lines: lines,
      updatedAt: _clock(),
      editedByAdmin: false,
    );
    notifyListeners();
  }

  /// "Yarın ürün istemiyorum" — siparişi reddeder.
  void declineOrder(String customerId, {String? note}) {
    final existing = _orders[customerId];
    _orders[customerId] = (existing ??
            DailyOrder(customerId: customerId, status: OrderStatus.pending, lines: const []))
        .copyWith(
      status: OrderStatus.declined,
      lines: const [],
      updatedAt: _clock(),
      note: note,
    );
    notifyListeners();
  }
}

// ---------------------------------------------------------------- InheritedNotifier

/// Uygulama boyunca AppState'e erişim ve otomatik yeniden çizim sağlar.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope bir ata widget olarak bulunamadı');
    return scope!.notifier!;
  }
}
