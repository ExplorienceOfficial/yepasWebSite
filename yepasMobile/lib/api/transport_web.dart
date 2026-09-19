// Yepas mobil — package:http tabanlı taşıma (web).
// Sertifika doğrulaması tarayıcı tarafından yönetilir; allowBadCertificate yok sayılır.

import 'dart:async';

import 'package:http/http.dart' as http;

import 'transport.dart';

Future<TransportResponse> sendRequest({
  required String method,
  required Uri uri,
  required Map<String, String> headers,
  String? body,
  required Duration timeout,
  required bool allowBadCertificate,
}) async {
  final client = http.Client();
  try {
    final req = http.Request(method, uri);
    req.headers.addAll(headers);
    if (body != null) {
      req.headers['content-type'] = 'application/json';
      req.body = body;
    }
    final streamed = await client.send(req).timeout(timeout);
    final resp = await http.Response.fromStream(streamed);
    return TransportResponse(resp.statusCode, resp.body);
  } on TimeoutException {
    throw const TransportException('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
  } catch (_) {
    throw const TransportException(
        'Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edip tekrar deneyin.');
  } finally {
    client.close();
  }
}
