import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:yepas_mobile/main.dart';

void main() {
  testWidgets('Geçersiz vergi numarası hata gösterir', (tester) async {
    await tester.pumpWidget(const YepasApp());

    expect(find.text('Bayi Sipariş'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('tax')), '0000000000');
    await tester.tap(find.text('Giriş yap'));
    await tester.pump();

    expect(find.text('Bu vergi numarasına ait bayi bulunamadı.'), findsOneWidget);
  });

  testWidgets('Çok şubeli vergi numarasında şube alanı belirir', (tester) async {
    await tester.pumpWidget(const YepasApp());

    // Şube alanı başta gizli.
    expect(find.byKey(const Key('branch')), findsNothing);

    // Çok şubeli demo vergi numarası girilince şube seçimi görünür.
    await tester.enterText(find.byKey(const Key('tax')), '1234567890');
    await tester.pump();

    expect(find.byKey(const Key('branch')), findsOneWidget);
  });
}
