// Yepas mobil — platformdan bağımsız HTTP taşıma katmanı.
//
// Gerçek gönderim mobil/masaüstünde dart:io (transport_io.dart), web'de
// package:http (transport_web.dart) ile yapılır. Kendinden-imzalı DEV
// sertifikası yalnız dart:io tarafında geçerlidir (web'de tarayıcı yönetir).

import 'transport_stub.dart'
    if (dart.library.io) 'transport_io.dart'
    if (dart.library.html) 'transport_web.dart' as impl;

class TransportResponse {
  final int statusCode;
  final String body;
  const TransportResponse(this.statusCode, this.body);
}

/// Bağlantı/sertifika/zaman aşımı kaynaklı taşıma hatası.
class TransportException implements Exception {
  final String message;
  const TransportException(this.message);
  @override
  String toString() => 'TransportException: $message';
}

Future<TransportResponse> sendRequest({
  required String method,
  required Uri uri,
  required Map<String, String> headers,
  String? body,
  required Duration timeout,
  required bool allowBadCertificate,
}) =>
    impl.sendRequest(
      method: method,
      uri: uri,
      headers: headers,
      body: body,
      timeout: timeout,
      allowBadCertificate: allowBadCertificate,
    );
