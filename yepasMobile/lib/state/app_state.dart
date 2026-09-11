// Yepas mobil — uygulama durumu.
// Admin panelindeki OperationsContext'in müşteri tarafını taşır:
// sipariş kuralı (limit/ortalama), kesim saati, sistem açık/kapalı, sipariş girişi.

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/seed_data.dart';
import '../models/models.dart';

/// Uygulama arka plandayken oturumun geçerli kalacağı süre.
/// Bu süreden kısa arka plan geçişlerinde tekrar giriş istenmez.
const Duration kSessionTimeout = Duration(minutes: 30);

const String _kAccounts = 'yepas.accounts';
const String _kActiveBranch = 'yepas.activeBranch';
const String _kActiveAt = 'yepas.activeAt';

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

  /// Oturumda kayıtlı şubeler (aynı vergi numarasına bağlı tüm bayiler).
  /// Giriş sonrası bunlar arasında tekrar şifre girmeden geçiş yapılabilir.
  List<Customer> sessionBranches = [];

  bool get hasMultipleBranches => sessionBranches.length > 1;

  /// Kayıtlı hesaplar (vergi numaraları). Login ekranında tek dokunuşla
  /// otomatik giriş için listelenir.
  List<String> rememberedTaxNumbers = [];

  SharedPreferences? _prefs;
  DateTime? _activeAt;

  // ---- sipariş verileri ----
  late final Map<String, DailyOrder> _orders;
  late final Map<String, DailyOrder> _deliveryOrders; // bugün teslim — salt okunur

  AppState() {
    _orders = {for (final o in kDailyOrders) o.customerId: o};
    _deliveryOrders = {for (final o in kDeliveryOrders) o.customerId: o};
  }

  /// Uygulama açılışında çağrılır: kayıtlı hesapları ve — süresi geçmediyse —
  /// son oturumu geri yükler.
  Future<void> loadPersisted() async {
    final prefs = await SharedPreferences.getInstance();
    _prefs = prefs;
    rememberedTaxNumbers = (prefs.getStringList(_kAccounts) ?? [])
        .where((t) => branchesForTax(t).isNotEmpty)
        .toList();

    final branchId = prefs.getString(_kActiveBranch);
    final at = prefs.getInt(_kActiveAt);
    if (branchId != null && at != null) {
      final elapsed = DateTime.now().millisecondsSinceEpoch - at;
      final branch = customerById(branchId);
      if (branch != null && elapsed < kSessionTimeout.inMilliseconds) {
        currentCustomerId = branch.id;
        sessionBranches = branchesForTax(branch.taxNumber);
        _activeAt = DateTime.fromMillisecondsSinceEpoch(at);
      } else {
        // Süre doldu → kilitli başla (kayıtlı hesap kalır, aktif oturum silinir).
        await prefs.remove(_kActiveBranch);
        await prefs.remove(_kActiveAt);
      }
    }
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
  /// Aynı vergi numarasına bağlı tüm şubeler oturuma + kayıtlı hesaplara eklenir.
  bool loginWith(Customer branch, String password) {
    if (branch.password != password) return false;
    _openSession(branch);
    _rememberAccount(branch.taxNumber);
    return true;
  }

  /// Kayıtlı hesaptan tek dokunuşla giriş (şifre sorulmaz).
  void quickLogin(Customer branch) {
    _openSession(branch);
    _rememberAccount(branch.taxNumber);
  }

  void _openSession(Customer branch) {
    sessionBranches = branchesForTax(branch.taxNumber);
    currentCustomerId = branch.id;
    _touchAndPersist();
    notifyListeners();
  }

  /// Oturumdaki şubeler arasında geçiş yapar (tekrar şifre gerekmez).
  void switchBranch(String customerId) {
    if (customerId == currentCustomerId) return;
    if (sessionBranches.any((b) => b.id == customerId)) {
      currentCustomerId = customerId;
      _touchAndPersist();
      notifyListeners();
    }
  }

  /// Tam çıkış: aktif oturumu kapatır ve bu hesabı kayıtlılardan siler.
  void logout() {
    final tax = currentCustomer?.taxNumber;
    currentCustomerId = null;
    sessionBranches = [];
    if (tax != null) rememberedTaxNumbers.remove(tax);
    _prefs?.setStringList(_kAccounts, rememberedTaxNumbers);
    _prefs?.remove(_kActiveBranch);
    _prefs?.remove(_kActiveAt);
    notifyListeners();
  }

  /// Kayıtlı bir hesabı (vergi numarası) login ekranından kaldırır.
  void forgetAccount(String taxNumber) {
    rememberedTaxNumbers.remove(taxNumber);
    _prefs?.setStringList(_kAccounts, rememberedTaxNumbers);
    notifyListeners();
  }

  // ---- oturum süresi (arka plan) ----

  /// Uygulama arka plana geçerken çağrılır — ayrılma zamanını kaydeder.
  void touchSession() {
    if (currentCustomerId == null) return;
    _touchAndPersist();
  }

  /// Arka planda kalınan süre eşiği aştıysa true.
  bool get isSessionExpired {
    if (_activeAt == null) return false;
    return DateTime.now().difference(_activeAt!) > kSessionTimeout;
  }

  /// Oturumu kilitler (login'e döner) ama kayıtlı hesapları korur.
  void lockSession() {
    currentCustomerId = null;
    sessionBranches = [];
    _prefs?.remove(_kActiveBranch);
    _prefs?.remove(_kActiveAt);
    notifyListeners();
  }

  void _rememberAccount(String taxNumber) {
    if (!rememberedTaxNumbers.contains(taxNumber)) {
      rememberedTaxNumbers.add(taxNumber);
      _prefs?.setStringList(_kAccounts, rememberedTaxNumbers);
    }
  }

  void _touchAndPersist() {
    _activeAt = DateTime.now();
    _prefs?.setString(_kActiveBranch, currentCustomerId ?? '');
    _prefs?.setInt(_kActiveAt, _activeAt!.millisecondsSinceEpoch);
  }

  // ---- demo: admin sistem açık/kapalı ----

  /// Sipariş sistemini açar/kapatır. Kapalıyken müşteri giriş yapamaz.
  void setSystemOpen(bool open) {
    orderSystemOpen = open;
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
