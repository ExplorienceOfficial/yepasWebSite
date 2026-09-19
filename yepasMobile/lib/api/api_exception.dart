// Yepas mobil — API hata modeli.
//
// Sunucu hata gövdesi {code, message} biçimindedir; bazı 401/403/404
// yanıtları gövdesiz olabilir (openapi.yaml Error şeması). Ağ/sertifika/zaman
// aşımı hataları da bu tip altında taşınır.

class ApiException implements Exception {
  /// HTTP durum kodu — ağ hatalarında null.
  final int? statusCode;

  /// Sunucu hata kodu, örn. ORDER_WINDOW_CLOSED — yoksa null (README §6).
  final String? code;

  /// Ham (sunucu veya varsayılan) mesaj. Kullanıcıya [userMessage] gösterilmeli.
  final String message;

  /// Bağlantı/sertifika/zaman aşımı kaynaklı geçici hata mı?
  final bool isNetwork;

  const ApiException({
    this.statusCode,
    this.code,
    required this.message,
    this.isNetwork = false,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isConflict => statusCode == 409;
  bool get isUnavailable => statusCode == 503;

  bool get passwordChangeRequired => code == 'PASSWORD_CHANGE_REQUIRED';
  bool get revisionConflict => code == 'ORDER_REVISION_CONFLICT';
  bool get windowClosed => code == 'ORDER_WINDOW_CLOSED';
  bool get finalized => code == 'ORDER_FINALIZED';

  /// Hata koduna göre kullanıcıya gösterilecek Türkçe metin (README §6).
  String get userMessage {
    switch (code) {
      case 'INVALID_LOGIN':
        return 'Kullanıcı adı veya parola hatalı.';
      case 'IDEMPOTENCY_REQUIRED':
        return 'İşlem anahtarı gerekli. Lütfen tekrar deneyin.';
      case 'PASSWORD_CHANGE_REQUIRED':
        return 'Devam etmek için geçici parolanızı değiştirmelisiniz.';
      case 'ORDER_WINDOW_CLOSED':
        return 'Sipariş penceresi kapandı. Şu anda değişiklik yapılamıyor.';
      case 'ORDER_REVISION_CONFLICT':
        return 'Sipariş bu sırada güncellendi. En son hali yüklendi, lütfen kontrol edin.';
      case 'ORDER_FINALIZED':
        return 'Bu teslim günü kesinleşti, artık değiştirilemez.';
      case 'IDEMPOTENCY_CONFLICT':
        return 'Bu işlem farklı bir içerikle tekrarlandı. Lütfen tekrar deneyin.';
      case 'AUTH_UNAVAILABLE':
      case 'ORDER_UNAVAILABLE':
      case 'BRANCHES_UNAVAILABLE':
      case 'DRIVER_ROUTE_UNAVAILABLE':
        return 'Hizmet geçici olarak kullanılamıyor. Lütfen biraz sonra tekrar deneyin.';
      // INVALID_ORDER, PASSWORD_CHANGE_REJECTED: sunucu mesajını göster.
      default:
        return message;
    }
  }

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
