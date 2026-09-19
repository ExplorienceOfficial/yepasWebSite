// Yepas mobil — API istemcisi.
//
// Ortak başlıkları (X-Yepas-Client, Bearer token, Idempotency-Key) ekler,
// JSON çözer ve HTTP durum kodlarını ApiException'a çevirir. Gerçek gönderim
// platforma göre transport katmanında yapılır.
// accessToken, parola veya tam başlıklar loglanmaz (README §7).

import 'dart:convert';

import '../config/env.dart';
import 'api_exception.dart';
import 'transport.dart';

/// Geçerli oturum tokenını veren geri çağrı (yoksa null).
typedef TokenProvider = String? Function();

class ApiClient {
  final TokenProvider _token;
  final Duration timeout;

  ApiClient(this._token, {this.timeout = const Duration(seconds: 20)});

  Future<dynamic> get(String path) => _send('GET', path);

  Future<dynamic> post(String path, {Object? body}) =>
      _send('POST', path, body: body);

  Future<dynamic> put(String path, {Object? body, String? idempotencyKey}) =>
      _send('PUT', path, body: body, idempotencyKey: idempotencyKey);

  Uri _uri(String path) {
    if (!Env.isConfigured) {
      throw const ApiException(
        message:
            'API adresi yapılandırılmamış. Uygulama --dart-define=YEPAS_BASE_URL ile derlenmelidir.',
        isNetwork: true,
      );
    }
    final base = Env.baseUrl.endsWith('/')
        ? Env.baseUrl.substring(0, Env.baseUrl.length - 1)
        : Env.baseUrl;
    final rel = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$rel');
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    String? idempotencyKey,
  }) async {
    final uri = _uri(path);
    final headers = <String, String>{'Accept': 'application/json'};

    final token = _token();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    // Zorunlu mobil istemci başlığı yalnız POST/PUT'ta (README §Ortak başlıklar).
    if (method == 'POST' || method == 'PUT') {
      headers['X-Yepas-Client'] = Env.clientId;
    }
    if (idempotencyKey != null && idempotencyKey.isNotEmpty) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    TransportResponse resp;
    try {
      resp = await sendRequest(
        method: method,
        uri: uri,
        headers: headers,
        body: body == null ? null : jsonEncode(body),
        timeout: timeout,
        allowBadCertificate: Env.allowSelfSigned,
      );
    } on TransportException catch (e) {
      throw ApiException(message: e.message, isNetwork: true);
    }

    return _handle(resp.statusCode, resp.body);
  }

  dynamic _handle(int status, String text) {
    dynamic json;
    if (text.isNotEmpty) {
      try {
        json = jsonDecode(text);
      } catch (_) {
        json = null;
      }
    }

    if (status >= 200 && status < 300) {
      return json; // 204 → null
    }

    String? code;
    String? serverMessage;
    if (json is Map) {
      final c = json['code'];
      final m = json['message'];
      if (c is String && c.isNotEmpty) code = c;
      if (m is String && m.isNotEmpty) serverMessage = m;
    }

    throw ApiException(
      statusCode: status,
      code: code,
      message: serverMessage ?? _defaultMessage(status),
    );
  }

  String _defaultMessage(int status) {
    switch (status) {
      case 400:
        return 'Geçersiz istek. Lütfen bilgileri kontrol edin.';
      case 401:
        return 'Oturum geçersiz. Lütfen tekrar giriş yapın.';
      case 403:
        return 'Bu işlem için yetkiniz yok.';
      case 404:
        return 'Kayıt bulunamadı. Lütfen listeyi yenileyin.';
      case 409:
        return 'İşlem çakışması oluştu. Lütfen tekrar deneyin.';
      case 503:
        return 'Hizmet geçici olarak kullanılamıyor. Lütfen sonra tekrar deneyin.';
      default:
        return 'Bir hata oluştu ($status).';
    }
  }
}
