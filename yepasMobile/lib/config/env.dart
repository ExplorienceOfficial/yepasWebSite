// Yepas mobil — ortam yapılandırması.
//
// API kökü ve DEV bayrakları derleme zamanında --dart-define ile verilir.
// Kaynak kodda sabit IP tutulmaz (README §Ortamlar):
//
//   flutter run \
//     --dart-define=YEPAS_BASE_URL=https://192.168.5.230:8443/api/v1 \
//     --dart-define=YEPAS_ALLOW_SELF_SIGNED=true   // yalnız iç DEV
//
// PROD derlemesinde YEPAS_ALLOW_SELF_SIGNED asla verilmez (README §7).
class Env {
  /// API kökü, örn. https://192.168.5.230:8443/api/v1
  static const String baseUrl = String.fromEnvironment('YEPAS_BASE_URL');

  /// Yalnız iç DEV testinde güvenilmeyen geliştirme sertifikasına izin verir.
  /// PROD'da sertifika doğrulaması hiçbir koşulda kapatılmamalıdır (README §7).
  static const bool allowSelfSigned =
      bool.fromEnvironment('YEPAS_ALLOW_SELF_SIGNED');

  /// Zorunlu mobil istemci başlığı — tüm POST/PUT çağrılarında (README §Ortak başlıklar).
  static const String clientId = 'mobile-v1';

  /// Giriş rolü — bu uygulama yalnız müşteri (bayi) tarafını taşır.
  static const String role = 'CUSTOMER';

  static bool get isConfigured => baseUrl.trim().isNotEmpty;
}
