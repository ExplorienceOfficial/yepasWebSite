import 'package:flutter/material.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'login_screen.dart';
import 'main_shell.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final customer = app.currentCustomer;
    if (customer == null) return const SizedBox.shrink();

    return Scaffold(
      appBar: AppBar(title: const Text('Profilim')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _Header(customer: customer),
          const SizedBox(height: 14),
          _AccountCard(customer: customer),
          const SizedBox(height: 14),
          _BranchesSection(app: app, activeId: customer.id),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: () {
              app.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (r) => false,
              );
            },
            icon: const Icon(Icons.logout_rounded, size: 19, color: YpColors.bad),
            label: const Text('Çıkış yap', style: TextStyle(color: YpColors.bad)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: YpColors.badSoft)),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final Customer customer;
  const _Header({required this.customer});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: YpColors.accentSoft, borderRadius: BorderRadius.circular(16)),
              child: Text(initials(customer.name),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: YpColors.accent)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(customer.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
                  const SizedBox(height: 2),
                  Text('${customer.branchNo}. Şube · ${customer.type} · ${customer.district}',
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
  final Customer customer;
  const _AccountCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Hesap',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
            const SizedBox(height: 12),
            _row(Icons.receipt_long_rounded, 'Vergi Numarası', customer.taxNumber),
            _row(Icons.qr_code_2_rounded, 'Bayi Kodu', customer.code),
            _row(Icons.person_outline_rounded, 'Yetkili', customer.contact, last: true),
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
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontSize: 13.5, color: YpColors.ink2))),
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
  final String activeId;
  const _BranchesSection({required this.app, required this.activeId});

  @override
  Widget build(BuildContext context) {
    final branches = app.sessionBranches;
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
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
                ),
                Text('${branches.length} şube',
                    style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
              ],
            ),
            const SizedBox(height: 4),
            if (branches.length <= 1)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Bu vergi numarasına bağlı tek şube var.',
                    style: TextStyle(fontSize: 13, color: YpColors.ink3)),
              )
            else
              for (final b in branches) _tile(context, b),
          ],
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, Customer b) {
    final active = b.id == activeId;
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
                  app.switchBranch(b.id);
                  MainShell.of(context)?.goTo(0);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${b.name} şubesine geçildi')),
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
                  child: Text('${b.branchNo}',
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
                      Text(b.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                      Text('${b.branchNo}. Şube · ${b.district}',
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
