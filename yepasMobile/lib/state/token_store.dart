// Yepas mobil — oturum tokenı güvenli cihaz deposunda saklanır (README §1, §7).
// Kolaylık için son kullanılan kullanıcı adı (gizli değil) ayrıca tutulur.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TokenStore {
  static const _kToken = 'yepas.accessToken';
  static const _kLastLogin = 'yepas.lastLoginName';

  final FlutterSecureStorage _secure;

  TokenStore({FlutterSecureStorage? secure})
      : _secure = secure ?? const FlutterSecureStorage();

  Future<String?> readToken() async {
    try {
      final t = await _secure.read(key: _kToken);
      return (t != null && t.isNotEmpty) ? t : null;
    } catch (_) {
      return null;
    }
  }

  Future<void> writeToken(String token) async {
    try {
      await _secure.write(key: _kToken, value: token);
    } catch (_) {/* güvenli depo yoksa oturum yalnız bellekte kalır */}
  }

  Future<void> clearToken() async {
    try {
      await _secure.delete(key: _kToken);
    } catch (_) {}
  }

  Future<String?> readLastLoginName() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_kLastLogin);
    } catch (_) {
      return null;
    }
  }

  Future<void> writeLastLoginName(String loginName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kLastLogin, loginName);
    } catch (_) {}
  }
}
