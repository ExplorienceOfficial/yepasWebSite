import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState();
  await state.loadPersisted();
  runApp(YepasApp(state: state));
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
    if (lifecycle == AppLifecycleState.paused ||
        lifecycle == AppLifecycleState.hidden) {
      // Ayrılma zamanını kaydet — kısa süreli arka plan geçişlerinde
      // oturum korunur.
      _state.touchSession();
    } else if (lifecycle == AppLifecycleState.resumed) {
      // Uzun süre arka planda kalındıysa oturumu kilitle ve login'e dön.
      if (_state.currentCustomerId != null && _state.isSessionExpired) {
        _state.lockSession();
        navigatorKey.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (r) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = _state.currentCustomerId != null;
    return AppScope(
      state: _state,
      child: MaterialApp(
        title: 'Yepas Bayi Sipariş',
        navigatorKey: navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: buildYepasTheme(),
        home: loggedIn ? const MainShell() : const LoginScreen(),
      ),
    );
  }
}
