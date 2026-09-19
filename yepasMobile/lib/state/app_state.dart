// Yepas mobil — uygulama durumu (gerçek API v1 üzerinde).
//
// Oturum tokenını, kimliği, şubeleri ve seçili şubenin sipariş bağlamını taşır.
// Ekranlar bu duruma AppScope üzerinden erişir ve değişimlerde yeniden çizilir.

import 'package:flutter/widgets.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../api/yepas_api.dart';
import '../models/models.dart';
import 'token_store.dart';

/// Uygulamanın oturum aşaması — kök widget buna göre ekran seçer.
enum AuthPhase {
  loading, // açılışta token doğrulanıyor
  bootstrapFailed, // açılışta ağ hatası — yeniden dene
  loggedOut, // giriş ekranı
  mustChangePassword, // geçici parola değiştirilmeli
  ready, // ana uygulama
}

class AppState extends ChangeNotifier {
  late final YepasApi api;
  final TokenStore _store;

  AppState({YepasApi? api, TokenStore? store})
      : _store = store ?? TokenStore() {
    this.api = api ?? YepasApi(ApiClient(() => _token));
  }

  // ---- oturum ----
  AuthPhase phase = AuthPhase.loading;
  Identity? identity;
  String? _token;
  String? lastLoginName;

  String? get token => _token;

  // ---- şubeler ----
  List<CustomerBranch> branches = const [];
  int? selectedMbId;

  CustomerBranch? get currentBranch {
    for (final b in branches) {
      if (b.legacyMbId == selectedMbId) return b;
    }
    return branches.isNotEmpty ? branches.first : null;
  }

  bool get hasMultipleBranches => branches.length > 1;

  // ---- seçili şubenin sipariş bağlamı ----
  CustomerOrderContext? context;
  bool contextLoading = false;
  ApiException? contextError;

  // ------------------------------------------------------------- açılış

  /// Uygulama açılışında: token varsa doğrular, şubeleri ve bağlamı yükler.
  Future<void> bootstrap() async {
    lastLoginName = await _store.readLastLoginName();
    _token = await _store.readToken();

    if (_token == null) {
      _set(AuthPhase.loggedOut);
      return;
    }

    try {
      identity = await api.me();
      if (identity!.mustChangePassword) {
        _set(AuthPhase.mustChangePassword);
        return;
      }
      await _loadBranches();
      _set(AuthPhase.ready);
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await _forgetSession();
        _set(AuthPhase.loggedOut);
      } else if (e.passwordChangeRequired || e.isForbidden) {
        _set(AuthPhase.mustChangePassword);
      } else {
        // Ağ/servis hatası: token silinmez, yeniden denenebilir.
        _set(AuthPhase.bootstrapFailed);
      }
    }
  }

  // ------------------------------------------------------------- giriş

  /// Kullanıcı adı + parola ile giriş. Hata ApiException olarak fırlatılır.
  Future<void> login(String loginName, String password) async {
    final result = await api.login(loginName: loginName, password: password);
    _token = result.accessToken;
    identity = result.identity;
    await _store.writeToken(result.accessToken);
    await _store.writeLastLoginName(loginName);
    lastLoginName = loginName;

    if (result.mustChangePassword) {
      _set(AuthPhase.mustChangePassword);
      return;
    }
    await _loadBranches();
    _set(AuthPhase.ready);
  }

  /// Parola değiştirir. Mecburi akıştan geliyorsa uygulamaya devam eder.
  Future<void> changePassword(String currentPassword, String newPassword) async {
    await api.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
    identity = identity?.copyWith(mustChangePassword: false);
    if (phase == AuthPhase.mustChangePassword) {
      await _loadBranches();
      _set(AuthPhase.ready);
    } else {
      notifyListeners();
    }
  }

  /// Çıkış — tokenı sunucuda iptal eder ve yereli temizler.
  Future<void> logout() async {
    try {
      await api.logout();
    } catch (_) {/* en iyi çaba — yerel temizlik yine yapılır */}
    await _forgetSession();
    _set(AuthPhase.loggedOut);
  }

  /// Açılış ağ hatasından sonra yeniden dener.
  Future<void> retryBootstrap() async {
    _set(AuthPhase.loading);
    await bootstrap();
  }

  // ------------------------------------------------------------- şubeler

  Future<void> _loadBranches() async {
    branches = await api.branches();
    if (branches.isEmpty) {
      selectedMbId = null;
      context = null;
      return;
    }
    selectedMbId = branches.first.legacyMbId;
    await _loadContext();
  }

  /// Oturumdaki şubeler arasında geçiş (tekrar giriş gerekmez).
  Future<void> selectBranch(int legacyMbId) async {
    if (legacyMbId == selectedMbId) return;
    selectedMbId = legacyMbId;
    context = null;
    contextError = null;
    notifyListeners();
    await _loadContext();
  }

  /// Seçili şubenin sipariş bağlamını (yeniden) yükler.
  Future<void> refreshContext() => _loadContext();

  Future<void> _loadContext() async {
    final mbId = selectedMbId;
    if (mbId == null) return;
    contextLoading = true;
    contextError = null;
    notifyListeners();
    try {
      context = await api.orderContext(mbId);
    } on ApiException catch (e) {
      contextError = e;
      if (e.isUnauthorized) {
        await _forgetSession();
        _set(AuthPhase.loggedOut);
        return;
      }
      if (e.passwordChangeRequired) {
        _set(AuthPhase.mustChangePassword);
        return;
      }
    } finally {
      contextLoading = false;
      notifyListeners();
    }
  }

  // ------------------------------------------------------------- sipariş

  /// Sipariş oluşturur/günceller (SUBMITTED). Çağıran ApiException'ı yakalar.
  Future<Order> submitOrder({
    required List<OrderLineInput> lines,
    String? note,
    required int revision,
    required String idempotencyKey,
  }) {
    return _save(SaveOrderRequest(
      revision: revision,
      status: OrderStatus.submitted,
      note: note,
      lines: lines,
    ), idempotencyKey);
  }

  /// "Ürün istemiyorum" (NO_PRODUCT) — satırlar boş olmalı (README §3).
  Future<Order> declineOrder({
    String? note,
    required int revision,
    required String idempotencyKey,
  }) {
    return _save(SaveOrderRequest(
      revision: revision,
      status: OrderStatus.noProduct,
      note: note,
      lines: const [],
    ), idempotencyKey);
  }

  Future<Order> _save(SaveOrderRequest request, String idempotencyKey) async {
    final mbId = selectedMbId;
    if (mbId == null) {
      throw const ApiException(message: 'Şube seçili değil.');
    }
    final order = await api.saveOrder(mbId, request, idempotencyKey: idempotencyKey);
    context = context?.copyWith(order: order);
    notifyListeners();
    return order;
  }

  // ------------------------------------------------------------- yardımcılar

  Future<void> _forgetSession() async {
    await _store.clearToken();
    _token = null;
    identity = null;
    branches = const [];
    selectedMbId = null;
    context = null;
    contextError = null;
  }

  void _set(AuthPhase p) {
    phase = p;
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
