import 'package:flutter_test/flutter_test.dart';
import 'package:yepas_mobile/utils/dates.dart';
import 'package:yepas_mobile/utils/format.dart';
import 'package:yepas_mobile/utils/ids.dart';

void main() {
  group('tarih', () {
    test('teslim tarihi tr-TR biçimlenir', () {
      expect(formatDeliveryDate(DateTime(2026, 9, 19)), '19 Eylül 2026, Cumartesi');
      expect(formatDeliveryDate(DateTime(2026, 9, 18)), '18 Eylül 2026, Cuma');
    });

    test('kesim dakikası saate çevrilir', () {
      expect(formatCutoffMinute(1080), '18:00');
      expect(formatCutoffMinute(1050), '17:30');
      expect(formatCutoffMinute(0), '00:00');
    });

    test('UTC saat yerele çevrilir', () {
      final utc = DateTime.utc(2026, 9, 18, 12, 5);
      final local = utc.toLocal();
      final expected =
          '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
      expect(formatClockUtc(utc), expected);
    });
  });

  group('format', () {
    test('adet binlik ayraçla', () {
      expect(formatQty(1200), '1.200');
      expect(formatQty(75), '75');
    });

    test('vergi numarası maskelenir (README §7)', () {
      expect(maskTax('1234567890'), '••••••••90');
      expect(maskTax(''), '');
      expect(maskTax('12'), '12');
    });
  });

  group('idempotency', () {
    test('uuidV4 biçimi ve benzersizliği', () {
      final a = uuidV4();
      final b = uuidV4();
      expect(a, matches(RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')));
      expect(a, isNot(b));
    });
  });
}
