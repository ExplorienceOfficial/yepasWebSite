import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../utils/format.dart';

/// −/＋ adet sayacı. Uzun basınca hızlı artış yok; her dokunuş [step] kadar.
class QtyStepper extends StatelessWidget {
  final int value;
  final int max;
  final int step;
  final ValueChanged<int> onChanged;

  /// Sayıya dokununca tam değer girişi için (opsiyonel).
  final VoidCallback? onTapValue;

  const QtyStepper({
    super.key,
    required this.value,
    required this.max,
    required this.onChanged,
    this.onTapValue,
    this.step = 10,
  });

  void _set(int v) {
    final clamped = v.clamp(0, max);
    if (clamped != value) onChanged(clamped);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: YpColors.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: YpColors.hairline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _btn(Icons.remove_rounded, value <= 0 ? null : () => _set(value - step)),
          InkWell(
            onTap: onTapValue,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              constraints: const BoxConstraints(minWidth: 52),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                formatQty(value),
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w700, color: YpColors.ink),
              ),
            ),
          ),
          _btn(Icons.add_rounded, value >= max ? null : () => _set(value + step)),
        ],
      ),
    );
  }

  Widget _btn(IconData icon, VoidCallback? onTap) {
    final enabled = onTap != null;
    return InkResponse(
      onTap: onTap,
      radius: 24,
      child: Padding(
        padding: const EdgeInsets.all(9),
        child: Icon(
          icon,
          size: 22,
          color: enabled ? YpColors.accent : YpColors.ink3.withValues(alpha: 0.5),
        ),
      ),
    );
  }
}
