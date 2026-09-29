import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'change_password_screen.dart';
import 'main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  bool _remember = false;
  bool _prefilled = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Sistem durumu giriş ekranı açılırken sunucudan okunur.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) AppScope.of(context).refreshSystemStatus();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_prefilled) return;
    final app = AppScope.of(context);
    final remembered = app.rememberedLoginName;
    if (remembered != null && _userController.text.isEmpty) {
      _userController.text = remembered;
    }
    _remember = app.rememberCredentials;
    _prefilled = true;
  }

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    final userName = _userController.text.trim();
    final password = _passwordController.text;
    if (userName.isEmpty || password.isEmpty) {
      setState(() => _error = 'Kullanıcı adı ve parola zorunludur.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final app = AppScope.of(context);
    final error = await app.login(userName, password, remember: _remember);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => app.mustChangePassword
            ? const ChangePasswordScreen()
            : const MainShell(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final systemClosed = app.systemStatusKnown && !app.orderSystemOpen;

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
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: YpColors.surface,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: YpColors.hairline),
                      ),
                      child:
                          Image.asset('assets/logo.png', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(height: 22),
                  const Text(
                    'Bayi Sipariş',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    systemClosed
                        ? 'Sipariş sistemi şu an kapalı.'
                        : 'Yöneticinizin oluşturduğu hesapla giriş yapın.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, color: YpColors.ink2),
                  ),
                  const SizedBox(height: 28),
                  const Text('Kullanıcı adı',
                      style:
                          TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('username'),
                    controller: _userController,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    enabled: !systemClosed,
                    decoration: _decoration(
                      hint: 'Kullanıcı adınız',
                      icon: Icons.person_outline_rounded,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Parola',
                      style:
                          TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('password'),
                    controller: _passwordController,
                    obscureText: _obscure,
                    enabled: !systemClosed,
                    keyboardType: TextInputType.visiblePassword,
                    smartDashesType: SmartDashesType.disabled,
                    smartQuotesType: SmartQuotesType.disabled,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _submit(),
                    decoration: _decoration(
                      hint: 'Parolanız',
                      icon: Icons.lock_outline_rounded,
                    ).copyWith(
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          color: YpColors.ink3,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  CheckboxListTile(
                    key: const Key('remember'),
                    value: _remember,
                    onChanged: systemClosed
                        ? null
                        : (value) async {
                            final remember = value ?? false;
                            setState(() => _remember = remember);
                            if (!remember) {
                              await AppScope.of(context).forgetSavedPassword();
                            }
                          },
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text('Kullanıcı adımı hatırla',
                        style: TextStyle(fontSize: 14)),
                    subtitle: const Text('Parola bu cihazda saklanmaz.',
                        style: TextStyle(fontSize: 12, color: YpColors.ink3)),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: YpColors.bad)),
                  ],
                  const SizedBox(height: 22),
                  if (systemClosed)
                    Container(
                      key: const Key('system-closed'),
                      padding: const EdgeInsets.symmetric(
                          vertical: 16, horizontal: 18),
                      decoration: BoxDecoration(
                        color: YpColors.badSoft,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.lock_outline_rounded,
                              color: YpColors.bad, size: 20),
                          SizedBox(width: 10),
                          Text('Sistem kapalı',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: YpColors.bad)),
                        ],
                      ),
                    )
                  else
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Giriş yap'),
                    ),
                  const SizedBox(height: 16),
                  Text(
                    systemClosed
                        ? 'Sipariş alımı açıldığında giriş yapabilirsiniz.'
                        : 'Şubeleriniz girişten sonra sunucudan güvenli olarak yüklenir.',
                    textAlign: TextAlign.center,
                    style:
                        const TextStyle(fontSize: 12.5, color: YpColors.ink3),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _decoration({required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: YpColors.surface,
      prefixIcon: Icon(icon, color: YpColors.ink3),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.accent, width: 1.6),
      ),
    );
  }
}
