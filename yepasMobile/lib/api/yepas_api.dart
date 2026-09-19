// Yepas mobil — tipli API sözleşmesi (openapi.yaml uçları).

import '../config/env.dart';
import '../models/models.dart';
import 'api_client.dart';

class YepasApi {
  final ApiClient _c;
  YepasApi(this._c);

  // -------------------------------------------------------------------- Auth

  /// POST /auth/login — müşteri girişi (role = CUSTOMER).
  Future<LoginResult> login({
    required String loginName,
    required String password,
  }) async {
    final json = await _c.post('/auth/login', body: {
      'loginName': loginName,
      'password': password,
      'role': Env.role,
    });
    return LoginResult.fromJson(json as Map<String, dynamic>);
  }

  /// GET /auth/me — aktif oturumu doğrular.
  Future<Identity> me() async {
    final json = await _c.get('/auth/me');
    return Identity.fromJson(json as Map<String, dynamic>);
  }

  /// POST /auth/change-password — 204 döner.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _c.post('/auth/change-password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  /// POST /auth/logout — aktif tokenı iptal eder (204).
  Future<void> logout() async {
    await _c.post('/auth/logout');
  }

  // ---------------------------------------------------------------- Customer

  /// GET /customer/branches — hesaba bağlı şubeler.
  Future<List<CustomerBranch>> branches() async {
    final json = await _c.get('/customer/branches');
    return ((json as List?) ?? const [])
        .map((e) => CustomerBranch.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /customer/branches/{legacyMbId}/order — pencere, ürünler, mevcut sipariş.
  Future<CustomerOrderContext> orderContext(int legacyMbId) async {
    final json = await _c.get('/customer/branches/$legacyMbId/order');
    return CustomerOrderContext.fromJson(json as Map<String, dynamic>);
  }

  /// PUT /customer/branches/{legacyMbId}/order — sipariş oluştur/güncelle.
  /// Ağ tekrarında aynı [idempotencyKey] ve aynı gövde kullanılmalıdır (README §7).
  Future<Order> saveOrder(
    int legacyMbId,
    SaveOrderRequest request, {
    required String idempotencyKey,
  }) async {
    final json = await _c.put(
      '/customer/branches/$legacyMbId/order',
      body: request.toJson(),
      idempotencyKey: idempotencyKey,
    );
    return Order.fromJson(json as Map<String, dynamic>);
  }
}
