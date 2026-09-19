// Yepas mobil — tr-TR tarih/saat biçimlendirme (intl bağımlılığı olmadan).
//
// *Utc alanları UTC yorumlanıp yerel (TR) saate çevrilir; deliveryDate ise
// takvim günüdür ve saat dilimi dönüşümü uygulanmaz (README §7).

const List<String> _months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const List<String> _weekdays = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
];

String _two(int n) => n.toString().padLeft(2, '0');

/// "19 Eylül 2026, Cuma" — takvim günü, dönüşüm yok.
String formatDeliveryDate(DateTime day) {
  final wd = _weekdays[day.weekday - 1];
  return '${day.day} ${_months[day.month - 1]} ${day.year}, $wd';
}

/// "19 Eylül 2026" — kısa takvim günü.
String formatDay(DateTime day) =>
    '${day.day} ${_months[day.month - 1]} ${day.year}';

/// UTC anını yerel saate çevirip "14:30" verir.
String formatClockUtc(DateTime utc) {
  final local = utc.toLocal();
  return '${_two(local.hour)}:${_two(local.minute)}';
}

/// UTC anını yerel "19 Eyl 2026 14:30" olarak verir.
String formatDateTimeUtc(DateTime utc) {
  final l = utc.toLocal();
  return '${l.day} ${_months[l.month - 1].substring(0, 3)} ${l.year} '
      '${_two(l.hour)}:${_two(l.minute)}';
}

/// Gün içi dakikayı (0-1439) "17:30" saatine çevirir.
String formatCutoffMinute(int minute) {
  final m = minute % 1440;
  return '${_two(m ~/ 60)}:${_two(m % 60)}';
}
