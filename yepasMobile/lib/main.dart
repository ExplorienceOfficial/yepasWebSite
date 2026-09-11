import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const YepasApp());
}

class YepasApp extends StatefulWidget {
  const YepasApp({super.key});

  @override
  State<YepasApp> createState() => _YepasAppState();
}

class _YepasAppState extends State<YepasApp> {
  final AppState _state = AppState();

  @override
  void dispose() {
    _state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: _state,
      child: MaterialApp(
        title: 'Yepas Bayi Sipariş',
        debugShowCheckedModeBanner: false,
        theme: buildYepasTheme(),
        home: const LoginScreen(),
      ),
    );
  }
}
