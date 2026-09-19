import 'package:flutter/material.dart';

import 'screens/change_password_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'screens/splash_screen.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState();
  runApp(YepasApp(state: state));
  // İlk kare çizildikten sonra oturumu doğrula (splash gösterilir).
  state.bootstrap();
}

class YepasApp extends StatefulWidget {
  final AppState? state;
  const YepasApp({super.key, this.state});

  @override
  State<YepasApp> createState() => _YepasAppState();
}

class _YepasAppState extends State<YepasApp> with WidgetsBindingObserver {
  late final AppState _state;

  @override
  void initState() {
    super.initState();
    _state = widget.state ?? AppState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _state.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState lifecycle) {
    // Uzun süre arka planda kalıp öne dönüldüğünde seçili şubenin bağlamını
    // tazele; token geçersizse durum kendini giriş ekranına düşürür.
    if (lifecycle == AppLifecycleState.resumed &&
        _state.phase == AuthPhase.ready) {
      _state.refreshContext();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: _state,
      child: MaterialApp(
        title: 'Yepas Bayi Sipariş',
        debugShowCheckedModeBanner: false,
        theme: buildYepasTheme(),
        home: AnimatedBuilder(
          animation: _state,
          builder: (context, _) {
            switch (_state.phase) {
              case AuthPhase.loading:
                return const SplashScreen();
              case AuthPhase.bootstrapFailed:
                return SplashScreen(
                  error: 'Sunucuya ulaşılamadı.',
                  onRetry: _state.retryBootstrap,
                );
              case AuthPhase.loggedOut:
                return const LoginScreen();
              case AuthPhase.mustChangePassword:
                return const ChangePasswordScreen(mandatory: true);
              case AuthPhase.ready:
                return const MainShell();
            }
          },
        ),
      ),
    );
  }
}
