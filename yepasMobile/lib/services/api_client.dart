import 'dart:convert';
import 'dart:io';

const String kApiBaseUrl = String.fromEnvironment(
  'YEPAS_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:5057',
);

class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class LoginSession {
  final String loginName;
  final bool mustChangePassword;

  const LoginSession({required this.loginName, required this.mustChangePassword});
}

/// Giriş öncesi okunan sistem durumu.
class SystemStatus {
  final bool isOpen;

  /// Sipariş alımının kapanma saati (HH:mm).
  final String cutoffTime;

  /// Gün başından kesim saatine kadar geçen dakika sayısı.
  final int cutoffMinute;

  const SystemStatus({
    required this.isOpen,
    required this.cutoffTime,
    required this.cutoffMinute,
  });
}

class ApiClient {
  final HttpClient _http = HttpClient();
  String? _accessToken;

  bool get isAuthenticated => _accessToken != null;

  Future<LoginSession> login(String loginName, String password) async {
    final response = await _request(
      'POST',
      '/api/v1/auth/login',
      body: {'loginName': loginName, 'password': password, 'role': 'CUSTOMER'},
      authenticated: false,
    ) as Map<String, dynamic>;
    final token = response['accessToken'] as String?;
    if (token == null || token.isEmpty) {
      throw const ApiException(500, 'Mobil oturum anahtarı alınamadı.');
    }
    _accessToken = token;
    return LoginSession(
      loginName: (response['loginName'] as String?) ?? loginName,
      mustChangePassword: response['mustChangePassword'] == true,
    );
  }

  /// Sipariş sisteminin açık olup olmadığını döndürür. Oturum gerektirmez;
  /// giriş ekranı kapalı sistemde "Sistem kapalı" gösterebilmek için kullanır.
  Future<SystemStatus> systemStatus() async {
    final response =
        await _request('GET', '/api/v1/system/status', authenticated: false);
    if (response is! Map<String, dynamic>) {
      throw const ApiException(500, 'Sistem durumu yanıtı geçersiz.');
    }
    final cutoffMinute = response['cutoffMinute'];
    return SystemStatus(
      isOpen: response['isOpen'] == true,
      cutoffTime: (response['cutoffTime'] as String?) ?? '',
      cutoffMinute: cutoffMinute is int ? cutoffMinute : 0,
    );
  }

  Future<List<Map<String, dynamic>>> branches() async {
    final response = await _request('GET', '/api/v1/customer/branches');
    if (response is! List) throw const ApiException(500, 'Şube yanıtı geçersiz.');
    return response.cast<Map<String, dynamic>>();
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _request(
      'POST',
      '/api/v1/auth/change-password',
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
      allowEmpty: true,
    );
  }

  Future<void> logout() async {
    if (_accessToken == null) return;
    try {
      await _request('POST', '/api/v1/auth/logout', allowEmpty: true);
    } finally {
      _accessToken = null;
    }
  }

  void clearSession() => _accessToken = null;

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
    bool allowEmpty = false,
  }) async {
    final request = await _http.openUrl(method, Uri.parse('$kApiBaseUrl$path'));
    request.headers.set('Accept', 'application/json');
    request.headers.set('X-Yepas-Client', 'mobile-v1');
    if (authenticated) {
      final token = _accessToken;
      if (token == null) throw const ApiException(401, 'Oturum bulunamadı.');
      request.headers.set('Authorization', 'Bearer $token');
    }
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }

    final response = await request.close();
    final text = await utf8.decoder.bind(response).join();
    dynamic decoded;
    if (text.trim().isNotEmpty) {
      try {
        decoded = jsonDecode(text);
      } on FormatException {
        decoded = null;
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? decoded['message'] as String?
          : null;
      throw ApiException(
        response.statusCode,
        message ?? _fallbackMessage(response.statusCode),
      );
    }
    if (allowEmpty && text.trim().isEmpty) return null;
    return decoded;
  }

  String _fallbackMessage(int statusCode) {
    if (statusCode == 401) return 'Kullanıcı adı veya parola hatalı.';
    if (statusCode == 403) return 'Bu işlem için yetkiniz bulunmuyor.';
    if (statusCode >= 500) return 'Sunucuya şu anda erişilemiyor.';
    return 'İşlem tamamlanamadı.';
  }
}
