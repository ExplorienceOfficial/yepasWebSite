// Yepas mobil — desteklenmeyen platform için taşıma yer tutucusu.
// dart:io veya dart:html bulunmayan bir hedefte derleme zamanında seçilir.

import 'transport.dart';

Future<TransportResponse> sendRequest({
  required String method,
  required Uri uri,
  required Map<String, String> headers,
  String? body,
  required Duration timeout,
  required bool allowBadCertificate,
}) {
  throw UnsupportedError('Bu platformda ağ katmanı desteklenmiyor.');
}
