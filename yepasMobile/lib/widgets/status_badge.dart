import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';

/// Sipariş durumuna göre renkli rozet.
class StatusBadge extends StatelessWidget {
  final OrderStatus status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    late final Color fg;
    late final Color bg;
    late final String label;
    late final IconData icon;

    switch (status) {
      case OrderStatus.ordered:
        fg = YpColors.ok;
        bg = YpColors.okSoft;
        label = 'Sipariş verildi';
        icon = Icons.check_circle_rounded;
        break;
      case OrderStatus.declined:
        fg = YpColors.bad;
        bg = YpColors.badSoft;
        label = 'İstenmedi';
        icon = Icons.cancel_rounded;
        break;
      case OrderStatus.pending:
        fg = YpColors.warn;
        bg = YpColors.warnSoft;
        label = 'Bekliyor';
        icon = Icons.schedule_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: fg),
          const SizedBox(width: 5),
          Text(label,
              style: TextStyle(color: fg, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
