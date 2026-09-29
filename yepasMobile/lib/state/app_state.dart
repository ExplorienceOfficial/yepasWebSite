import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import '../services/api_client.dart';

const Duration kSessionTimeout = Duration(minutes: 30);
const String _kRememberedLogin = 'yepas.rememberedLogin';
const String _kRememberedPassword = 'yepas.rememberedPassword';
const String _kRememberCredentials = 'yepas.rememberCredentials';

class AppState extends ChangeNotifier {
  final ApiClient api;

  AppState({ApiClient? apiClient}) : api = apiClient ?? ApiClient();

  List<ProductCategory> categories = const [];
  List<Product> products = const [];
  final List<Driver> drivers = const [];

  bool orderSystemOpen = true;
  OrderRule orderRule = OrderRule.limit;
  int maxQtyLimit = 0;
  String cutoffTime = '';
  bool orderWindowOpen = false;
  bool orderContextLoading = false;
  String? orderContextError;
  String? deliveryDate;
  final Map<String, int> _revisions = {};
  int _contextRequestId = 0;

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
  final Map<String, DailyOrder> _orders = {};
  final Map<String, DailyOrder> _deliveryOrders = {};

  Future<void> loadPersisted() async {
    _prefs = await SharedPreferences.getInstance();
    rememberedLoginName = _prefs?.getString(_kRememberedLogin);
    rememberCredentials = _prefs?.getBool(_kRememberCredentials) ?? false;
    await _prefs?.remove(_kRememberedPassword);
    rememberedPassword = null;
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
    final deadline =
        DateTime(reference.year, reference.month, reference.day, hour, minute);
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
    final limit = product.maxOrderLimit > 0 ? product.maxOrderLimit : 1000000;
    // Üst sınır da paket katına inmelidir; aksi hâlde girilemeyen bir üst
    // sınır gösterilir.
    final size = product.packageSize;
    return size <= 1 ? limit : (limit ~/ size) * size;
  }

  /// Ürünün paket adedi (5'li paketlerde 5).
  int packageSizeFor(String productId) =>
      productById(productId)?.packageSize ?? 1;

  Future<String?> login(String userName, String password,
      {bool remember = false}) async {
    try {
      final session = await api.login(userName.trim(), password);
      loginName = session.loginName;
      rememberedLoginName = remember ? session.loginName : null;
      mustChangePassword = session.mustChangePassword;
      if (remember) {
        await _prefs?.setString(_kRememberedLogin, session.loginName);
      } else {
        await _prefs?.remove(_kRememberedLogin);
      }
      await _storeCredentials(remember);
      if (!mustChangePassword) await _loadBranches();
      _activeAt = DateTime.now();
      notifyListeners();
      if (!mustChangePassword && currentCustomerId != null)
        await refreshOrderContext();
      return null;
    } on ApiException catch (error) {
      return error.message;
    } on Exception {
      return 'Giriş hizmetine erişilemiyor.';
    }
  }

  /// Yalnızca kullanıcı adı saklanır; eski düz metin parola her durumda silinir.
  Future<void> _storeCredentials(bool remember) async {
    rememberCredentials = remember;
    await _prefs?.setBool(_kRememberCredentials, remember);
    rememberedPassword = null;
    await _prefs?.remove(_kRememberedPassword);
  }

  /// Kayıtlı parolayı siler; kullanıcı adı giriş kolaylığı için kalır.
  Future<void> forgetSavedPassword() async {
    await _storeCredentials(false);
    rememberedLoginName = null;
    await _prefs?.remove(_kRememberedLogin);
    notifyListeners();
  }

  Future<String?> changePassword(
      String currentPassword, String newPassword) async {
    try {
      await api.changePassword(currentPassword, newPassword);
      mustChangePassword = false;
      await _loadBranches();
      _activeAt = DateTime.now();
      notifyListeners();
      if (currentCustomerId != null) await refreshOrderContext();
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
    currentCustomerId =
        sessionBranches.isEmpty ? null : sessionBranches.first.id;
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
    if (customerId != currentCustomerId &&
        sessionBranches.any((branch) => branch.id == customerId)) {
      currentCustomerId = customerId;
      products = const [];
      categories = const [];
      orderWindowOpen = false;
      deliveryDate = null;
      _orders.remove(customerId);
      _revisions.remove(customerId);
      _activeAt = DateTime.now();
      notifyListeners();
      refreshOrderContext();
    }
  }

  Future<void> refreshOrderContext() async {
    final customerId = currentCustomerId;
    if (customerId == null) return;
    final requestId = ++_contextRequestId;
    orderContextLoading = true;
    orderContextError = null;
    orderWindowOpen = false;
    notifyListeners();
    try {
      final context = await api.orderContext(int.parse(customerId));
      if (currentCustomerId != customerId || requestId != _contextRequestId)
        return;
      deliveryDate = context['deliveryDate'] as String?;
      orderWindowOpen =
          (context['window'] as Map<String, dynamic>?)?['isOpen'] == true;
      final rows = context['products'] as List<dynamic>? ?? const [];
      products = rows.map((entry) {
        final row = entry as Map<String, dynamic>;
        final variant = row['variantName'] as String?;
        return Product(
          id: '${row['uStokId']}:${row['aStokId']}',
          categoryId: 'all',
          name:
              '${row['name'] ?? ''}${variant == null || variant.isEmpty ? '' : ' · $variant'}',
          code: (row['code'] as String?) ?? '',
          maxOrderLimit: (row['maxQuantity'] as int?) ?? 0,
          avgOrder: 0,
          imageAsset: '',
          packageSizeOverride: (row['packageSize'] as int?) ?? 1,
        );
      }).toList();
      categories = const [
        ProductCategory(id: 'all', name: 'Tanımlı ürünler', line: '')
      ];
      _applyOrder(customerId, context['order'] as Map<String, dynamic>?);
    } on ApiException catch (error) {
      if (currentCustomerId == customerId && requestId == _contextRequestId) {
        orderContextError = error.message;
      }
    } on Exception {
      if (currentCustomerId == customerId && requestId == _contextRequestId)
        orderContextError = 'Sipariş bilgisine erişilemiyor.';
    } finally {
      if (currentCustomerId == customerId && requestId == _contextRequestId) {
        orderContextLoading = false;
        notifyListeners();
      }
    }
  }

  void _applyOrder(String customerId, Map<String, dynamic>? order) {
    if (order == null) {
      _orders.remove(customerId);
      _revisions[customerId] = 0;
      return;
    }
    _revisions[customerId] = (order['revision'] as int?) ?? 0;
    final lines = order['lines'] as List<dynamic>? ?? const [];
    _orders[customerId] = DailyOrder(
      customerId: customerId,
      status: order['status'] == 'SUBMITTED'
          ? OrderStatus.ordered
          : OrderStatus.declined,
      lines: [
        for (final item in lines)
          OrderLine(
              '${item['uStokId']}:${item['aStokId']}', item['quantity'] as int)
      ],
      updatedAt: _localTime(order['updatedAtUtc'] as String?),
    );
  }

  static String? _localTime(String? value) {
    if (value == null) return null;
    final date = DateTime.tryParse(value);
    if (date == null) return value;
    final local = date.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
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
      _activeAt != null &&
      DateTime.now().difference(_activeAt!) > kSessionTimeout;

  void lockSession() {
    api.clearSession();
    _clearSession();
    notifyListeners();
  }

  void _clearSession() {
    _contextRequestId++;
    currentCustomerId = null;
    loginName = null;
    mustChangePassword = false;
    sessionBranches = [];
    products = const [];
    categories = const [];
    _orders.clear();
    _revisions.clear();
    orderWindowOpen = false;
    deliveryDate = null;
    _activeAt = null;
  }

  Future<String?> submitOrder(String customerId, Map<String, int> draft) async {
    final lines = <Map<String, int>>[];
    draft.forEach((productId, qty) {
      if (qty <= 0) return;
      final product = productById(productId);
      if (product == null) return;
      final capped = product.roundToPackage(qty, maxQtyFor(productId));
      if (capped > 0) {
        final parts = productId.split(':');
        lines.add({
          'uStokId': int.parse(parts[0]),
          'aStokId': int.parse(parts[1]),
          'quantity': capped
        });
      }
    });
    if (lines.isEmpty) return 'En az bir ürün için adet girin.';
    return _saveOrder(customerId, 'SUBMITTED', lines);
  }

  Future<String?> declineOrder(String customerId) =>
      _saveOrder(customerId, 'NO_PRODUCT', const []);

  Future<String?> _saveOrder(
      String customerId, String status, List<Map<String, int>> lines) async {
    if (customerId != currentCustomerId ||
        !orderWindowOpen ||
        orderContextError != null) {
      return 'Sipariş penceresi kapalı veya bilgi alınamadı.';
    }
    try {
      // Devam eden eski GET yanıtı başarılı kaydı sonradan geri alamaz.
      _contextRequestId++;
      final saved = await api.saveOrder(int.parse(customerId), {
        'revision': _revisions[customerId] ?? 0,
        'status': status,
        'note': null,
        'lines': lines,
      });
      _applyOrder(customerId, saved);
      orderContextLoading = false;
      notifyListeners();
      return null;
    } on ApiException catch (error) {
      await refreshOrderContext();
      return error.message;
    } on Exception {
      await refreshOrderContext();
      return 'Kayıt doğrulanamadı. Güncel siparişi kontrol edip yeniden deneyin.';
    }
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
