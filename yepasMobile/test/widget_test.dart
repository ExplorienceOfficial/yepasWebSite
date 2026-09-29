import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yepas_mobile/main.dart';
import 'package:yepas_mobile/services/api_client.dart';
import 'package:yepas_mobile/state/app_state.dart';

class FailingApiClient extends ApiClient {
  @override
  Future<LoginSession> login(String loginName, String password) async {
    throw const ApiException(401, 'Kullanıcı adı veya parola hatalı.');
  }

  @override
  Future<SystemStatus> systemStatus() async =>
      const SystemStatus(isOpen: true, cutoffTime: '17:30', cutoffMinute: 1050);
}

class ClosedSystemApiClient extends ApiClient {
  @override
  Future<SystemStatus> systemStatus() async =>
      const SystemStatus(isOpen: false, cutoffTime: '17:30', cutoffMinute: 1050);
}

class UnreachableApiClient extends ApiClient {
  @override
  Future<SystemStatus> systemStatus() async =>
      throw const ApiException(503, 'Sistem durumuna erişilemiyor.');
}

void main() {
  testWidgets('sunucunun giriş hatasını gösterir', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(apiClient: FailingApiClient());
    await state.loadPersisted();
    await tester.pumpWidget(YepasApp(state: state));
    await tester.pumpAndSettle();
    expect(find.text('Bayi Sipariş'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('username')), 'musteri');
    await tester.enterText(find.byKey(const Key('password')), 'yanlis');
    await tester.tap(find.text('Giriş yap'));
    await tester.pumpAndSettle();
    expect(find.text('Kullanıcı adı veya parola hatalı.'), findsOneWidget);
  });

  testWidgets('sistem kapalıyken giriş düğmesi yerine "Sistem kapalı" yazar',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(apiClient: ClosedSystemApiClient());
    await state.loadPersisted();
    await tester.pumpWidget(YepasApp(state: state));
    await tester.pumpAndSettle();
    expect(find.text('Sistem kapalı'), findsOneWidget);
    expect(find.text('Giriş yap'), findsNothing);
    expect(find.text('Sipariş sistemi şu an kapalı.'), findsOneWidget);
  });

  testWidgets('durum okunamazsa giriş düğmesi kalır', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(apiClient: UnreachableApiClient());
    await state.loadPersisted();
    await tester.pumpWidget(YepasApp(state: state));
    await tester.pumpAndSettle();
    expect(find.text('Giriş yap'), findsOneWidget);
    expect(find.text('Sistem kapalı'), findsNothing);
  });

  testWidgets('kayıtlı hesap bilgileri giriş ekranını doldurur', (tester) async {
    SharedPreferences.setMockInitialValues({
      'yepas.rememberedLogin': 'musteri',
      'yepas.rememberedPassword': '123456789012',
      'yepas.rememberCredentials': true,
    });
    final state = AppState(apiClient: FailingApiClient());
    await state.loadPersisted();
    await tester.pumpWidget(YepasApp(state: state));
    await tester.pumpAndSettle();

    final userField = tester.widget<TextField>(find.byKey(const Key('username')));
    final passwordField = tester.widget<TextField>(find.byKey(const Key('password')));
    expect(userField.controller?.text, 'musteri');
    expect(passwordField.controller?.text, '123456789012');
    final checkbox = tester.widget<CheckboxListTile>(find.byKey(const Key('remember')));
    expect(checkbox.value, isTrue);
  });
}
