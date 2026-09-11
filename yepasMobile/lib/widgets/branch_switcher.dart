import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme/app_theme.dart';

/// Oturumdaki şubeler arasında geçiş için alt sayfa (bottom sheet).
Future<void> showBranchSwitcher(BuildContext context) {
  final app = AppScope.of(context);
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: YpColors.surface,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) {
      return SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(4, 0, 4, 4),
                child: Text('Şube değiştir',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                child: Text('Vergi No ${app.currentCustomer?.taxNumber ?? ''} · ${app.sessionBranches.length} şube',
                    style: const TextStyle(fontSize: 13, color: YpColors.ink2)),
              ),
              for (final b in app.sessionBranches)
                _BranchTile(
                  active: b.id == app.currentCustomerId,
                  branchNo: b.branchNo,
                  name: b.name,
                  district: b.district,
                  onTap: () {
                    app.switchBranch(b.id);
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${b.name} şubesine geçildi')),
                    );
                  },
                ),
            ],
          ),
        ),
      );
    },
  );
}

class _BranchTile extends StatelessWidget {
  final bool active;
  final int branchNo;
  final String name;
  final String district;
  final VoidCallback onTap;

  const _BranchTile({
    required this.active,
    required this.branchNo,
    required this.name,
    required this.district,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: active ? YpColors.accentSoft : YpColors.surface2,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: active ? null : onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active ? YpColors.accent : YpColors.surface3,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Text('$branchNo',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: active ? Colors.white : YpColors.ink2)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                      Text('$branchNo. Şube · $district',
                          style: const TextStyle(fontSize: 12.5, color: YpColors.ink2)),
                    ],
                  ),
                ),
                if (active)
                  const Icon(Icons.check_circle_rounded, color: YpColors.accent, size: 22)
                else
                  const Icon(Icons.chevron_right_rounded, color: YpColors.ink3),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
