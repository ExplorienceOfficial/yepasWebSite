// Yepas mobil — tema. Admin panelindeki Apple sistem paletiyle uyumlu.

import 'package:flutter/material.dart';

class YpColors {
  static const canvas = Color(0xFFF5F5F7);
  static const surface = Color(0xFFFFFFFF);
  static const surface2 = Color(0xFFF5F5F7);
  static const surface3 = Color(0xFFECECEE);

  static const ink = Color(0xFF1D1D1F);
  static const ink2 = Color(0xFF6E6E73);
  static const ink3 = Color(0xFF86868B);

  static const hairline = Color(0x14000000); // rgba(0,0,0,.08)

  static const accent = Color(0xFF0071E3);
  static const accentSoft = Color(0x1A0071E3);

  static const ok = Color(0xFF34C759);
  static const warn = Color(0xFFFF9500);
  static const bad = Color(0xFFFF3B30);
  static const okSoft = Color(0x1F34C759);
  static const warnSoft = Color(0x24FF9500);
  static const badSoft = Color(0x1FFF3B30);
}

ThemeData buildYepasTheme() {
  const scheme = ColorScheme.light(
    primary: YpColors.accent,
    onPrimary: Colors.white,
    secondary: YpColors.accent,
    surface: YpColors.surface,
    onSurface: YpColors.ink,
    error: YpColors.bad,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: YpColors.canvas,
    fontFamily: null, // sistem yazı tipi
    splashFactory: InkRipple.splashFactory,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      bodyColor: YpColors.ink,
      displayColor: YpColors.ink,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: YpColors.canvas,
      foregroundColor: YpColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: YpColors.ink,
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
      ),
    ),
    cardTheme: CardThemeData(
      color: YpColors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: YpColors.hairline),
      ),
    ),
    dividerTheme: const DividerThemeData(color: YpColors.hairline, thickness: 1, space: 1),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: YpColors.accent,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: YpColors.ink,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: YpColors.hairline),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: YpColors.ink,
      contentTextStyle: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
    ),
  );
}
