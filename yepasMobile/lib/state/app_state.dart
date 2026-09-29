import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/seed_data.dart';
import '../models/models.dart';
import '../services/api_client.dart';

const Duration kSessionTimeout = Duration(minutes: 30);
const String _kRememberedLogin = 'yepas.rememberedLogin';
const String _kRememberedPassword = 'yepas.rememberedPassword';
const String _kRememberCredentials = 'yepas.rememberCredentials';

class AppState extends ChangeNotifier {
  final ApiClient api;

  AppState({ApiClient? apiClient}) : api = apiClient ?? ApiClient() {
    _orders = {for (final order in kDailyOrders) order.customerId: order};
    _deliveryOrders = {for (final order in kDeliveryOrders) order.customerId: order};
  }

  final List<ProductCategory> categories = kCategories;
  final List<Product> products = kProducts;
  final List<Driver> drivers = kDrivers;

  bool orderSystemOpen = true;
  OrderRule orderRule = kDefaultOrderRule;
  int maxQtyLimit = kDefaultMaxQty;
  String cutoffTime = kOrderCutoff;

  /// Sistem durumu sunucudan okunabildi mi? Okunamadıysa giriş ekranı
  /// "Sistem kapalı" demek yerine bağlantı uyarısı gösterir.
  bool systemStatusKnown = false;

  String? currentCustomerId;
  String? loginName;
  String? rememberedLoginName;

  /// "Hesap bilgilerimi kaydet" seçiliyse parola da cihazda saklanır.
  String? rememberedPassword;
  bool rememberCredentials = false;
  bool mustChangePassword = false;
  List<Customer> sessionBranches = [];
  bool get hasMultipleBranches => sessionBranches.length > 1;
  bool get isAuthenticated => api.isAuthenticated;

  SharedPreferences? _prefs;
  DateTime? _activeAt;
  late final Map<String, DailyOrder> _orders;
  late final Map<String, DailyOrder> _deliveryOrders;

  Future<void> loadPersisted() async {
    _prefs = await SharedPreferences.getInstance();
    rememberedLoginName = _prefs?.getString(_kRememberedLogin);
    rememberCredentials = _prefs?.getBool(_kRememberCredentials) ?? false;
    rememberedPassword =
        rememberCredentials ? _prefs?.getString(_kRememberedPassword) : null;
  }

  /// Sunucudan sipariş sisteminin açık/kapalı durumunu okur.
  /// Başarısız olursa durum "bilinmiyor" kalır; ekranlar buna göre yazı gösterir.
  Future<void> refreshSystemStatus() async {
    try {
      final status = await api.systemStatus();
      orderSystemOpen = status.isOpen;
      if (status.cutoffTime.isNotEmpty) cutoffTime = status.cutoffTime;
      systemStatusKnown = true;
    } on Exception {
      systemStatusKnown = false;
    }
    notifyListeners();
  }

  /// Kesim saatine kalan dakika; saat geçtiyse veya saat okunamadıysa null.
  /// [now] yalnızca testler için verilir.
  int? minutesUntilCutoff({DateTime? now}) {
    final parts = cutoffTime.split(':');
    if (parts.length != 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    final reference = now ?? DateTime.now();
    final deadline = DateTime(
        reference.year, reference.month, reference.day, hour, minute);
    final remaining = deadline.difference(reference).inMinutes;
    return remaining < 0 ? null : remaining;
  }

  Customer? get currentCustomer {
    for (final branch in sessionBranches) {
      if (branch.id == currentCustomerId) return branch;
    }
    return null;
  }

  Product? productById(String id) {
    for (final product in products) {
      if (product.id == id) return product;
    }
    return null;
  }

  Driver? driverById(String id) {
    for (final driver in drivers) {
      if (driver.id == id) return driver;
    }
    return null;
  }

  ProductCategory categoryById(String id) =>
      categories.firstWhere((category) => category.id == id);

  List<Product> productsInCategory(String categoryId) =>
      products.where((product) => product.categoryId == categoryId).toList();

  DailyOrder? orderFor(String customerId) => _orders[customerId];
  DailyOrder? deliveryFor(String customerId) => _deliveryOrders[customerId];

  int maxQtyFor(String productId) {
    final product = productById(productId);
    if (product == null) return 0;
    final limit = orderRule == OrderRule.average
        ? product.avgOrder
        : (product.maxOrderLimit < maxQtyLimit
            ? product.maxOrderLimit
            : maxQtyLimit);
    // Üst sınır da paket katına inmelidir; aksi hâlde girilemeyen bir üst
    // sınır gösterilir.
    final size = product.packageSize;
    return size <= 1 ? limit : (limit ~/ size) * size;
  }

  /// Ürünün paket adedi (5'li paketlerde 5).
  int packageSizeFor(String productId) => productById(productId)?.packageSize ?? 1;

  Future<String?> login(String userName, String password,
      {bool remember = false}) async {
    try {
      final session = await api.login(userName.trim(), password);
      loginName = session.loginName;
      rememberedLoginName = session.loginName;
      mustChangePassword = session.mustChangePassword;
      await _prefs?.setString(_kRememberedLogin, session.loginName);
      await _storeCredentials(remember, password);
      if (!mustChangePassword) await _loadBranches();
      _activeAt = DateTime.now();
      notifyListeners();
      return null;
    } on ApiException catch (error) {
      return error.message;
    } on Exception {
      return 'Giriş hizmetine erişilemiyor.';
    }
  }

  /// Giriş bilgilerini cihazda saklar veya siler. Parola yalnızca kullanıcı
  /// "Hesap bilgilerimi kaydet" dediğinde ve yalnızca bu cihazda tutulur.
  Future<void> _storeCredentials(bool remember, String password) async {
    rememberCredentials = remember;
    await _prefs?.setBool(_kRememberCredentials, remember);
    if (remember) {
      rememberedPassword = password;
      await _prefs?.setString(_kRememberedPassword, password);
    } else {
      rememberedPassword = null;
      await _prefs?.remove(_kRememberedPassword);
    }
  }

  /// Kayıtlı parolayı siler; kullanıcı adı giriş kolaylığı için kalır.
  Future<void> forgetSavedPassword() async {
    await _storeCredentials(false, '');
    notifyListeners();
  }

  Future<String?> changePassword(String currentPassword, String newPassword) async {
    try {
      await api.changePassword(currentPassword, newPassword);
      mustChangePassword = false;
      // Kayıtlı giriş bilgisi varsa yeni parolayla güncellenir.
      if (rememberCredentials) await _storeCredentials(true, newPassword);
      await _loadBranches();
      _activeAt = DateTime.now();
      notifyListeners();
      return null;
    } on ApiException catch (error) {
      return error.message;
    } on Exception {
      return 'Parola değiştirilemiyor.';
    }
  }

  Future<void> _loadBranches() async {
    final rows = await api.branches();
    sessionBranches = [
      for (var index = 0; index < rows.length; index++)
        _customerFromJson(rows[index], index),
    ];
    currentCustomerId = sessionBranches.isEmpty ? null : sessionBranches.first.id;
  }

  Customer _customerFromJson(Map<String, dynamic> json, int index) {
    final mbId = json['legacyMbId'] as int;
    return Customer(
      id: mbId.toString(),
      code: (json['customerCode'] as String?) ?? '',
      name: (json['customerName'] as String?) ?? '',
      type: 'Müşteri',
      district: (json['departmentName'] as String?) ?? '',
      contact: (json['personnelName'] as String?) ?? '',
      phone: '',
      driverId: ((json['legacyPersonnelId'] as int?) ?? 0).toString(),
      stopNo: index + 1,
      taxNumber: (json['taxNumber'] as String?) ?? '',
      branchNo: (json['legacyDepartmentId'] as int?) ?? index + 1,
      password: '',
    );
  }

  void switchBranch(String customerId) {
    if (sessionBranches.any((branch) => branch.id == customerId)) {
      currentCustomerId = customerId;
      _activeAt = DateTime.now();
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await api.logout();
    _clearSession();
    notifyListeners();
  }

  void touchSession() {
    if (currentCustomerId != null) _activeAt = DateTime.now();
  }

  bool get isSessionExpired =>
      _activeAt != null && DateTime.now().difference(_activeAt!) > kSessionTimeout;

  void lockSession() {
    api.clearSession();
    _clearSession();
    notifyListeners();
  }

  void _clearSession() {
    currentCustomerId = null;
    loginName = null;
    mustChangePassword = false;
    sessionBranches = [];
    _activeAt = null;
  }

  String _clock() {
    final now = DateTime.now();
    final hour = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  void submitOrder(String customerId, Map<String, int> draft) {
    final lines = <OrderLine>[];
    draft.forEach((productId, qty) {
      if (qty <= 0) return;
      final product = productById(productId);
      if (product == null) return;
      // 5'li paketlerde adet her zaman 5'in katı olarak gönderilir.
      final capped = product.roundToPackage(qty, maxQtyFor(productId));
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

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope bir ata widget olarak bulunamadı');
    return scope!.notifier!;
  }
}
