import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'home_screen.dart';
import 'profile_screen.dart';

/// Giriş sonrası ana kabuk — altta Siparişler / Profilim sekmeleri.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => MainShellState();

  /// Alt sekmeler arasında geçiş için (ör. profilden siparişlere dönmek).
  static MainShellState? of(BuildContext context) =>
      context.findAncestorStateOfType<MainShellState>();
}

class MainShellState extends State<MainShell> {
  int _index = 0;

  void goTo(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    // Oturum kapanmışsa (currentCustomer null) burada bir şey çizmeyiz;
    // yönlendirme çıkış aksiyonunda yapılır.
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [HomeScreen(), ProfileScreen()],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: goTo,
        backgroundColor: YpColors.surface,
        indicatorColor: YpColors.accentSoft,
        height: 64,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded, color: YpColors.accent),
            label: 'Siparişler',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded, color: YpColors.accent),
            label: 'Profilim',
          ),
        ],
      ),
    );
  }
}
