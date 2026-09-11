// Küçük tr-TR biçimlendirme yardımcıları (intl bağımlılığı olmadan).

/// 1200 -> "1.200"
String formatQty(int value) {
  final digits = value.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  return value < 0 ? '-$buf' : buf.toString();
}

/// "Bereket Market Kızılay" -> "BM"
String initials(String name) {
  final parts = name.split(' ').where((p) => p.isNotEmpty).take(2);
  return parts.map((w) => w[0].toUpperCase()).join();
}
