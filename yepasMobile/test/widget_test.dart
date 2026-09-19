import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:yepas_mobile/screens/login_screen.dart';
import 'package:yepas_mobile/state/app_state.dart';

Widget _wrap(AppState state) => AppScope(
      state: state,
      child: const MaterialApp(home: LoginScreen()),
    );

void main() {
  testWidgets('Giriş ekranı kullanıcı adı ile açılır', (tester) async {
    await tester.pumpWidget(_wrap(AppState()));

    expect(find.text('Bayi Sipariş'), findsOneWidget);
    expect(find.text('Kullanıcı adı'), findsOneWidget);
    // Demo/vergi alanları kaldırıldı.
    expect(find.byKey(const Key('loginName')), findsOneWidget);
    expect(find.byKey(const Key('password')), findsOneWidget);
  });

  testWidgets('Boş kullanıcı adı hata gösterir', (tester) async {
    await tester.pumpWidget(_wrap(AppState()));

    await tester.tap(find.text('Giriş yap'));
    await tester.pump();

    expect(find.text('Lütfen kullanıcı adınızı girin.'), findsOneWidget);
  });

  testWidgets('Kullanıcı adı dolu, şifre boş → şifre hatası', (tester) async {
    await tester.pumpWidget(_wrap(AppState()));

    await tester.enterText(find.byKey(const Key('loginName')), 'musteri');
    await tester.tap(find.text('Giriş yap'));
    await tester.pump();

    expect(find.text('Lütfen şifrenizi girin.'), findsOneWidget);
  });
}
