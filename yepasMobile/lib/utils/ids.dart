// Yepas mobil — Idempotency-Key için RFC 4122 v4 UUID üretimi (bağımlılıksız).

import 'dart:math';

final Random _rng = Random.secure();

/// Yeni kullanıcı işlemi için benzersiz UUID (README §Ortak başlıklar).
String uuidV4() {
  final bytes = List<int>.generate(16, (_) => _rng.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // sürüm 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // varyant 10xx
  String hex(int start, int end) {
    final sb = StringBuffer();
    for (var i = start; i < end; i++) {
      sb.write(bytes[i].toRadixString(16).padLeft(2, '0'));
    }
    return sb.toString();
  }

  return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
}
