import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yepas_mobile/models/models.dart';
import 'package:yepas_mobile/services/api_client.dart';
import 'package:yepas_mobile/state/app_state.dart';

class FakeApiClient extends ApiClient {
  bool authenticated = false;
  bool passwordChangeRequired = false;
  bool systemOpen = true;
  bool statusFails = false;

  @override
  bool get isAuthenticated => authenticated;

  @override
  Future<SystemStatus> systemStatus() async {
    if (statusFails) throw const ApiException(503, 'Sistem durumuna erişilemiyor.');
    return SystemStatus(isOpen: systemOpen, cutoffTime: '17:30', cutoffMinute: 1050);
  }

  @override
  Future<LoginSession> login(String loginName, String password) async {
    if (password != 'correct-password') {
      throw const ApiException(401, 'Kullanıcı adı veya parola hatalı.');
    }
    authenticated = true;
    return LoginSession(
      loginName: loginName,
      mustChangePassword: passwordChangeRequired,
    );
  }

  @override
  Future<List<Map<String, dynamic>>> branches() async => [
        {
          'legacyMbId': 101,
          'legacyDepartmentId': 11,
          'legacyPersonnelId': 31,
          'customerCode': 'M.001',
          'customerName': 'Test Müşteri',
          'departmentName': 'Merkez',
          'taxNumber': '1234567890',
          'personnelName': 'Test Şoför',
        },
        {
          'legacyMbId': 102,
          'legacyDepartmentId': 12,
          'legacyPersonnelId': 31,
          'customerCode': 'M.001',
          'customerName': 'Test Müşteri',
          'departmentName': 'Şube',
          'taxNumber': '1234567890',
          'personnelName': 'Test Şoför',
        },
      ];

  @override
  Future<void> changePassword(String currentPassword, String newPassword) async {
    passwordChangeRequired = false;
  }

  @override
  Future<void> logout() async => authenticated = false;

  @override
  void clearSession() => authenticated = false;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('gerçek girişten sonra hesaba bağlı şubeler yüklenir', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    expect(await app.login('musteri', 'correct-password'), isNull);
    expect(app.sessionBranches.length, 2);
    expect(app.currentCustomerId, '101');
    app.switchBranch('102');
    expect(app.currentCustomerId, '102');
  });

  test('hatalı parola sunucu hatasını kullanıcıya döndürür', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    expect(await app.login('musteri', 'wrong'), 'Kullanıcı adı veya parola hatalı.');
    expect(app.currentCustomerId, isNull);
  });

  test('geçici parola değişmeden şubeler açılmaz', () async {
    SharedPreferences.setMockInitialValues({});
    final api = FakeApiClient()..passwordChangeRequired = true;
    final app = AppState(apiClient: api);
    await app.loadPersisted();
    expect(await app.login('musteri', 'correct-password'), isNull);
    expect(app.mustChangePassword, isTrue);
    expect(app.sessionBranches, isEmpty);
    expect(await app.changePassword('correct-password', 'new-password-123'), isNull);
    expect(app.mustChangePassword, isFalse);
    expect(app.sessionBranches.length, 2);
  });

  test('çıkış yerel ve sunucu oturumunu temizler', () async {
    SharedPreferences.setMockInitialValues({});
    final api = FakeApiClient();
    final app = AppState(apiClient: api);
    await app.loadPersisted();
    await app.login('musteri', 'correct-password');
    await app.logout();
    expect(api.authenticated, isFalse);
    expect(app.currentCustomerId, isNull);
    expect(app.sessionBranches, isEmpty);
  });

  test('hesap bilgilerini kaydet seçilince parola da saklanır', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    expect(await app.login('musteri', 'correct-password', remember: true), isNull);

    // Yeni oturum kayıtlı bilgileri geri okur.
    final next = AppState(apiClient: FakeApiClient());
    await next.loadPersisted();
    expect(next.rememberCredentials, isTrue);
    expect(next.rememberedLoginName, 'musteri');
    expect(next.rememberedPassword, 'correct-password');
  });

  test('kaydetme kapalıyken parola saklanmaz', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    await app.login('musteri', 'correct-password');

    final next = AppState(apiClient: FakeApiClient());
    await next.loadPersisted();
    expect(next.rememberCredentials, isFalse);
    expect(next.rememberedLoginName, 'musteri');
    expect(next.rememberedPassword, isNull);
  });

  test('kayıtlı parola silinebilir', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    await app.login('musteri', 'correct-password', remember: true);
    await app.forgetSavedPassword();
    expect(app.rememberedPassword, isNull);

    final next = AppState(apiClient: FakeApiClient());
    await next.loadPersisted();
    expect(next.rememberedPassword, isNull);
  });

  test('parola değişince kayıtlı parola da güncellenir', () async {
    SharedPreferences.setMockInitialValues({});
    final api = FakeApiClient()..passwordChangeRequired = true;
    final app = AppState(apiClient: api);
    await app.loadPersisted();
    await app.login('musteri', 'correct-password', remember: true);
    await app.changePassword('correct-password', '123456789012');
    expect(app.rememberedPassword, '123456789012');
  });

  test('sistem durumu sunucudan okunur', () async {
    SharedPreferences.setMockInitialValues({});
    final api = FakeApiClient()..systemOpen = false;
    final app = AppState(apiClient: api);
    await app.loadPersisted();
    await app.refreshSystemStatus();
    expect(app.systemStatusKnown, isTrue);
    expect(app.orderSystemOpen, isFalse);
    expect(app.cutoffTime, '17:30');
  });

  test('durum okunamazsa bilinmiyor kalır', () async {
    SharedPreferences.setMockInitialValues({});
    final api = FakeApiClient()..statusFails = true;
    final app = AppState(apiClient: api);
    await app.loadPersisted();
    await app.refreshSystemStatus();
    expect(app.systemStatusKnown, isFalse);
  });

  test("5'li paket ürün adından tanınır", () {
    expect(_product("5 Lİ PAKET EKMEK").packageSize, 5);
    expect(_product("Susamlı 5'li").packageSize, 5);
    expect(_product('5li Roll').packageSize, 5);
    expect(_product('15li Roll').packageSize, 1);
    expect(_product('Tek Ekmek').packageSize, 1);
    expect(_product('Beşli Ekmek').packageSize, 1);
  });

  test("5'li paketlerde adet 5'in katına yuvarlanır", () {
    final product = _product("Sandviç 5'li", maxOrderLimit: 100);
    expect(product.roundToPackage(3, 100), 5);
    expect(product.roundToPackage(7, 100), 5);
    expect(product.roundToPackage(8, 100), 10);
    expect(product.roundToPackage(0, 100), 0);
    // Üst sınır da paket katına inmelidir.
    expect(product.roundToPackage(99, 98), 95);
  });

  test("5'li ürünün üst sınırı paket katına iner", () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    // Tohum katalogda 5'li ürün yok; tekil ürünlerde sınır değişmez.
    expect(app.maxQtyFor('p01'), 600);
    expect(app.packageSizeFor('p01'), 1);
  });

  test('kesim saatine kalan süre hesaplanır', () async {
    SharedPreferences.setMockInitialValues({});
    final app = AppState(apiClient: FakeApiClient());
    await app.loadPersisted();
    app.cutoffTime = '17:30';
    expect(app.minutesUntilCutoff(now: DateTime(2026, 9, 29, 17, 17)), 13);
    expect(app.minutesUntilCutoff(now: DateTime(2026, 9, 29, 9, 0)), 510);
    // Saat geçtiyse kalan süre yoktur.
    expect(app.minutesUntilCutoff(now: DateTime(2026, 9, 29, 18, 0)), isNull);
    // Saat okunamazsa kalan süre hesaplanmaz.
    app.cutoffTime = '';
    expect(app.minutesUntilCutoff(now: DateTime(2026, 9, 29, 9, 0)), isNull);
  });
}

Product _product(String name, {int maxOrderLimit = 500}) => Product(
      id: 'test',
      categoryId: 'cat',
      name: name,
      code: 'TST-1',
      maxOrderLimit: maxOrderLimit,
      avgOrder: 10,
      imageAsset: 'assets/urunler/1.jpg',
    );
