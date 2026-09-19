// Yepas mobil — dart:io tabanlı taşıma (mobil/masaüstü).
// DEV'de güvenilmeyen geliştirme sertifikasına yalnız [allowBadCertificate]
// true iken izin verilir (README §7, §8).

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'transport.dart';

Future<TransportResponse> sendRequest({
  required String method,
  required Uri uri,
  required Map<String, String> headers,
  String? body,
  required Duration timeout,
  required bool allowBadCertificate,
}) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
  if (allowBadCertificate) {
    client.badCertificateCallback = (cert, host, port) => true;
  }
  try {
    final req = await client.openUrl(method, uri);
    headers.forEach((k, v) => req.headers.set(k, v));
    if (body != null) {
      req.headers.contentType = ContentType.json;
      req.write(body);
    }
    final resp = await req.close().timeout(timeout);
    final text = await resp.transform(utf8.decoder).join();
    return TransportResponse(resp.statusCode, text);
  } on TimeoutException {
    throw const TransportException('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
  } on HandshakeException {
    throw const TransportException(
        'Güvenli bağlantı kurulamadı. DEV ortamında geliştirme sertifikası cihazda güvenilir olmalıdır.');
  } on SocketException {
    throw const TransportException(
        'Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edip tekrar deneyin.');
  } on HttpException {
    throw const TransportException('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
  } catch (_) {
    throw const TransportException(
        'Beklenmeyen bir bağlantı hatası oluştu. Lütfen tekrar deneyin.');
  } finally {
    client.close(force: true);
  }
}
