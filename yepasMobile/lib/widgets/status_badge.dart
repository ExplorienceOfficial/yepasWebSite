import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';

/// Sipariş durumuna göre renkli rozet. [status] null ise henüz sipariş yok.
class StatusBadge extends StatelessWidget {
  final OrderStatus? status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    late final Color fg;
    late final Color bg;
    late final String label;
    late final IconData icon;

    switch (status) {
      case OrderStatus.submitted:
        fg = YpColors.ok;
        bg = YpColors.okSoft;
        label = 'Sipariş verildi';
        icon = Icons.check_circle_rounded;
        break;
      case OrderStatus.noProduct:
        fg = YpColors.bad;
        bg = YpColors.badSoft;
        label = 'Ürün istenmedi';
        icon = Icons.do_not_disturb_on_rounded;
        break;
      case OrderStatus.cancelled:
        fg = YpColors.ink2;
        bg = YpColors.surface3;
        label = 'İptal edildi';
        icon = Icons.cancel_rounded;
        break;
      case null:
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
