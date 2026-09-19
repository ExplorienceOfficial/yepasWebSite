import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Açılış ekranı — oturum doğrulanırken ve açılış ağ hatasında gösterilir.
class SplashScreen extends StatelessWidget {
  final String? error;
  final VoidCallback? onRetry;

  const SplashScreen({super.key, this.error, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final hasError = error != null;
    return Scaffold(
      backgroundColor: YpColors.canvas,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: YpColors.surface,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: YpColors.hairline),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                ),
                const SizedBox(height: 28),
                if (hasError) ...[
                  const Icon(Icons.wifi_off_rounded, color: YpColors.ink3, size: 22),
                  const SizedBox(height: 12),
                  Text(error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 15, color: YpColors.ink2)),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    label: const Text('Tekrar dene'),
                  ),
                ] else
                  const SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(strokeWidth: 2.6),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
