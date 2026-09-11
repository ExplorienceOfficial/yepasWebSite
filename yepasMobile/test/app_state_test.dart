import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yepas_mobile/state/app_state.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Giriş kalıcıdır: yeni oturumda geri yüklenir', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();

    final branch = app.branchesForTax('1111111111').first;
    expect(app.loginWith(branch, '1234'), isTrue);
    expect(app.currentCustomerId, branch.id);
    expect(app.rememberedTaxNumbers, contains('1111111111'));

    // Uygulama yeniden açılmış gibi: kısa sürede oturum geri yüklenmeli.
    final app2 = AppState();
    await app2.loadPersisted();
    expect(app2.currentCustomerId, branch.id, reason: 'oturum korunmalı');
    expect(app2.rememberedTaxNumbers, contains('1111111111'));
  });

  test('Çok şubeli giriş tüm şubeleri oturuma/hesaplara kaydeder', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();

    final branches = app.branchesForTax('1234567890');
    expect(branches.length, 3);
    expect(app.loginWith(branches[1], '1234'), isTrue);
    expect(app.sessionBranches.length, 3, reason: 'kaç şube varsa hepsi kayıtlı');
    // Şifresiz şube geçişi:
    app.switchBranch(branches[2].id);
    expect(app.currentCustomerId, branches[2].id);
  });

  test('Kilit: oturum kapanır ama hesap kayıtlı kalır', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();
    final branch = app.branchesForTax('1111111111').first;
    app.loginWith(branch, '1234');

    app.lockSession();
    expect(app.currentCustomerId, isNull);
    expect(app.rememberedTaxNumbers, contains('1111111111'));

    // Kilitli açılış: hesap görünür kalır, oturum yok (login ekranı).
    final app2 = AppState();
    await app2.loadPersisted();
    expect(app2.currentCustomerId, isNull);
    expect(app2.rememberedTaxNumbers, contains('1111111111'));
  });

  test('Çıkış hesabı da siler', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();
    final branch = app.branchesForTax('1111111111').first;
    app.loginWith(branch, '1234');

    app.logout();
    expect(app.currentCustomerId, isNull);
    expect(app.rememberedTaxNumbers, isNot(contains('1111111111')));
  });

  test('quickLogin şifresiz giriş yapar', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();
    final branch = app.branchesForTax('1111111111').first;

    app.quickLogin(branch);
    expect(app.currentCustomerId, branch.id);
  });

  test('Yanlış şifre reddedilir', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();
    final branch = app.branchesForTax('1111111111').first;
    expect(app.loginWith(branch, '0000'), isFalse);
    expect(app.currentCustomerId, isNull);
  });

  test('Süresi dolmuş oturum geri yüklenmez, hesap kalır', () async {
    // Eski activeAt ile kalıcı durum simüle et (raw + flutter. önekli anahtarlar).
    final oldAt = DateTime.now()
        .subtract(const Duration(hours: 2))
        .millisecondsSinceEpoch;
    SharedPreferences.setMockInitialValues({
      'flutter.yepas.accounts': <String>['1111111111'],
      'flutter.yepas.activeBranch': 'c04',
      'flutter.yepas.activeAt': oldAt,
    });
    final app = AppState();
    await app.loadPersisted();
    expect(app.currentCustomerId, isNull, reason: 'süre dolduğu için kilitli');
    expect(app.rememberedTaxNumbers, contains('1111111111'));
  });

  test('Sistem kapalıyken bayrak değişir (demo anahtar)', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState();
    await app.loadPersisted();
    expect(app.orderSystemOpen, isTrue);
    app.setSystemOpen(false);
    expect(app.orderSystemOpen, isFalse);
  });
}
