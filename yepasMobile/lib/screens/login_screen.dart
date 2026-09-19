import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';

/// Giriş ekranı — kullanıcı adı + parola (role = CUSTOMER, README §1).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passController = TextEditingController();
  final _passFocus = FocusNode();

  bool _obscure = true;
  bool _loading = false;
  String? _error;
  bool _prefilled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_prefilled) {
      _prefilled = true;
      final last = AppScope.of(context).lastLoginName;
      if (last != null && last.isNotEmpty) {
        _userController.text = last;
      }
    }
  }

  @override
  void dispose() {
    _userController.dispose();
    _passController.dispose();
    _passFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final app = AppScope.of(context);
    final user = _userController.text.trim();
    final pass = _passController.text;

    if (user.isEmpty) {
      setState(() => _error = 'Lütfen kullanıcı adınızı girin.');
      return;
    }
    if (pass.isEmpty) {
      setState(() => _error = 'Lütfen şifrenizi girin.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await app.login(user, pass);
      // Başarılı: kök widget otomatik olarak uygulamaya geçer.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.userMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: YpColors.canvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: YpColors.surface,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: YpColors.hairline),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x0F000000),
                              blurRadius: 18,
                              offset: Offset(0, 6)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      padding: const EdgeInsets.all(12),
                      child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(height: 22),
                  const Text('Bayi Sipariş',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.6)),
                  const SizedBox(height: 6),
                  const Text('Yepas fırın siparişlerinizi buradan geçin.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 15, color: YpColors.ink2)),
                  const SizedBox(height: 28),

                  _sectionLabel('Kullanıcı adı'),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('loginName'),
                    controller: _userController,
                    enabled: !_loading,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    enableSuggestions: false,
                    onSubmitted: (_) => _passFocus.requestFocus(),
                    onChanged: (_) {
                      if (_error != null) setState(() => _error = null);
                    },
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                    decoration: _decoration(
                        hint: 'kullanıcı adınız',
                        icon: Icons.person_outline_rounded),
                  ),

                  const SizedBox(height: 16),
                  _sectionLabel('Şifre'),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('password'),
                    controller: _passController,
                    focusNode: _passFocus,
                    enabled: !_loading,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _submit(),
                    onChanged: (_) {
                      if (_error != null) setState(() => _error = null);
                    },
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                    decoration:
                        _decoration(hint: '••••', icon: Icons.lock_outline_rounded)
                            .copyWith(
                      suffixIcon: IconButton(
                        icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            color: YpColors.ink3,
                            size: 20),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Row(children: [
                      const Icon(Icons.error_outline_rounded,
                          size: 17, color: YpColors.bad),
                      const SizedBox(width: 6),
                      Expanded(
                          child: Text(_error!,
                              style: const TextStyle(
                                  color: YpColors.bad, fontSize: 13.5))),
                    ]),
                  ],

                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.4, color: Colors.white))
                        : const Text('Giriş yap'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(text,
      style: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2));

  InputDecoration _decoration({String? hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
          color: YpColors.ink3, letterSpacing: 0, fontWeight: FontWeight.w400),
      filled: true,
      fillColor: YpColors.surface,
      prefixIcon: Icon(icon, color: YpColors.ink3),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.accent, width: 1.6),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.hairline),
      ),
    );
  }
}
