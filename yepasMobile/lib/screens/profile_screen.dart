import 'package:flutter/material.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'change_password_screen.dart';
import 'main_shell.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final branch = app.currentBranch;
    final identity = app.identity;

    return Scaffold(
      appBar: AppBar(title: const Text('Profilim')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _Header(branch: branch, loginName: identity?.loginName ?? ''),
          const SizedBox(height: 14),
          _AccountCard(branch: branch, loginName: identity?.loginName ?? ''),
          const SizedBox(height: 14),
          if (app.hasMultipleBranches) ...[
            _BranchesSection(app: app),
            const SizedBox(height: 14),
          ],
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
            ),
            icon: const Icon(Icons.key_rounded, size: 19),
            label: const Text('Parola değiştir'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context, app),
            icon: const Icon(Icons.logout_rounded, size: 19, color: YpColors.bad),
            label: const Text('Çıkış yap', style: TextStyle(color: YpColors.bad)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: YpColors.badSoft)),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, AppState app) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Çıkış yapılsın mı?'),
        content: const Text('Oturumunuz kapatılacak ve tekrar giriş yapmanız gerekecek.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: YpColors.bad, minimumSize: const Size(64, 42)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Çıkış yap'),
          ),
        ],
      ),
    );
    if (ok == true) {
      // Kök widget çıkış sonrası otomatik olarak giriş ekranına döner.
      await app.logout();
    }
  }
}

class _Header extends StatelessWidget {
  final CustomerBranch? branch;
  final String loginName;
  const _Header({required this.branch, required this.loginName});

  @override
  Widget build(BuildContext context) {
    final title = branch?.departmentName.isNotEmpty == true
        ? branch!.departmentName
        : (branch?.customerName ?? loginName);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: YpColors.accentSoft, borderRadius: BorderRadius.circular(16)),
              child: Text(initials(title),
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800, color: YpColors.accent)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
                  const SizedBox(height: 2),
                  Text('@$loginName',
                      style: const TextStyle(fontSize: 13, color: YpColors.ink2)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  final CustomerBranch? branch;
  final String loginName;
  const _AccountCard({required this.branch, required this.loginName});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Hesap',
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
            const SizedBox(height: 12),
            _row(Icons.person_outline_rounded, 'Kullanıcı adı', loginName),
            if (branch != null) ...[
              _row(Icons.qr_code_2_rounded, 'Bayi Kodu', branch!.customerCode),
              _row(Icons.receipt_long_rounded, 'Vergi No', maskTax(branch!.taxNumber)),
              _row(Icons.badge_outlined, 'Personel',
                  branch!.personnelName.isEmpty ? '–' : branch!.personnelName,
                  last: true),
            ],
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value, {bool last = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: last ? 0 : 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: YpColors.ink3),
          const SizedBox(width: 12),
          SizedBox(width: 120, child: Text(label, style: const TextStyle(fontSize: 13.5, color: YpColors.ink2))),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _BranchesSection extends StatelessWidget {
  final AppState app;
  const _BranchesSection({required this.app});

  @override
  Widget build(BuildContext context) {
    final branches = app.branches;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Şubelerim',
                      style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
                ),
                Text('${branches.length} şube',
                    style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
              ],
            ),
            for (final b in branches) _tile(context, b),
          ],
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, CustomerBranch b) {
    final active = b.legacyMbId == app.selectedMbId;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Material(
        color: active ? YpColors.accentSoft : YpColors.surface2,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: active
              ? null
              : () {
                  app.selectBranch(b.legacyMbId);
                  MainShell.of(context)?.goTo(0);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${b.departmentName} şubesine geçildi')),
                  );
                },
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
                  child: Icon(Icons.store_mall_directory_rounded,
                      size: 20, color: active ? Colors.white : YpColors.ink2),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(b.departmentName.isEmpty ? b.customerName : b.departmentName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                      Text('${b.customerCode} · ${b.customerName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12.5, color: YpColors.ink2)),
                    ],
                  ),
                ),
                if (active)
                  const _ActiveChip()
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

class _ActiveChip extends StatelessWidget {
  const _ActiveChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(color: YpColors.accent, borderRadius: BorderRadius.circular(999)),
      child: const Text('Aktif',
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white)),
    );
  }
}
