import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/dates.dart';
import '../utils/format.dart';
import '../utils/ids.dart';
import '../widgets/branch_switcher.dart';
import '../widgets/status_badge.dart';
import 'order_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  /// "Ürün istemiyorum" için bekleyen idempotency anahtarı; ağ tekrarında
  /// aynı anahtar kullanılır (README §7).
  String? _declineKey;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final branch = app.currentBranch;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(branch?.departmentName.isNotEmpty == true
                ? branch!.departmentName
                : (branch?.customerName ?? 'Yepas Bayi'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            if (branch != null)
              Text('${branch.customerCode} · ${branch.customerName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12.5,
                      color: YpColors.ink2,
                      fontWeight: FontWeight.w400)),
          ],
        ),
        actions: [
          if (app.hasMultipleBranches)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                avatar: const Icon(Icons.swap_horiz_rounded,
                    size: 18, color: YpColors.accent),
                label: const Text('Şube'),
                labelStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: YpColors.accent),
                backgroundColor: YpColors.accentSoft,
                side: BorderSide.none,
                onPressed: () => showBranchSwitcher(context),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: app.refreshContext,
        child: _body(app, branch),
      ),
    );
  }

  Widget _body(AppState app, CustomerBranch? branch) {
    if (app.contextLoading && app.context == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (app.context == null && app.contextError != null) {
      return _ErrorState(
        message: app.contextError!.userMessage,
        onRetry: app.refreshContext,
      );
    }
    final ctx = app.context;
    if (ctx == null || branch == null) {
      return _ErrorState(
        message: 'Şube bilgisi yüklenemedi.',
        onRetry: app.refreshContext,
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        if (!ctx.window.isOpen) const _ClosedBanner(),
        _OrderStatusCard(
          context: ctx,
          onDecline: () => _confirmDecline(app, ctx),
        ),
        const SizedBox(height: 14),
        _InfoCard(branch: branch),
      ],
    );
  }

  Future<void> _confirmDecline(AppState app, CustomerOrderContext ctx) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        title: const Text('Ürün istemiyor musunuz?'),
        content: const Text(
            'Bu teslimat için siparişiniz "ürün istenmedi" olarak kaydedilecek. '
            'Sipariş penceresi açık olduğu sürece tekrar sipariş girebilirsiniz.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dctx, false),
              child: const Text('Vazgeç')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: YpColors.bad, minimumSize: const Size(64, 42)),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Evet, istemiyorum'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    _declineKey ??= uuidV4();
    try {
      await app.declineOrder(
        revision: ctx.order?.revision ?? 0,
        idempotencyKey: _declineKey!,
      );
      _declineKey = null;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bu teslimat için sipariş kapatıldı.')),
        );
      }
    } on ApiException catch (e) {
      if (!e.isNetwork) _declineKey = null; // yalnız ağ hatasında anahtar korunur
      if (e.revisionConflict || e.windowClosed || e.finalized) {
        await app.refreshContext();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.userMessage)),
        );
      }
    }
  }
}

// ------------------------------------------------------------- kapalı uyarısı

class _ClosedBanner extends StatelessWidget {
  const _ClosedBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: YpColors.warnSoft,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        children: [
          Icon(Icons.lock_clock_rounded, color: YpColors.warn, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Sipariş penceresi kapalı. Yeni giriş veya değişiklik yapılamıyor.',
              style: TextStyle(fontSize: 13.5, color: YpColors.ink, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------- sipariş kartı

class _OrderStatusCard extends StatelessWidget {
  final CustomerOrderContext context;
  final VoidCallback onDecline;
  const _OrderStatusCard({required this.context, required this.onDecline});

  @override
  Widget build(BuildContext buildContext) {
    final order = context.order;
    final window = context.window;
    final open = window.isOpen;
    final status = order?.status;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Bu teslimatın siparişi',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: YpColors.ink2)),
                ),
                StatusBadge(status),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.local_shipping_rounded,
                    size: 17, color: YpColors.ink3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(formatDeliveryDate(context.deliveryDate),
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _summary(order, window),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: open
                  ? () => Navigator.of(buildContext).push(
                        MaterialPageRoute(builder: (_) => const OrderScreen()),
                      )
                  : null,
              icon: Icon(
                  status == OrderStatus.submitted
                      ? Icons.edit_rounded
                      : Icons.add_rounded,
                  size: 20),
              label: Text(status == OrderStatus.submitted
                  ? 'Siparişi düzenle'
                  : 'Sipariş oluştur'),
            ),
            if (open && status != OrderStatus.noProduct) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: onDecline,
                icon: const Icon(Icons.do_not_disturb_on_outlined,
                    size: 19, color: YpColors.bad),
                label: const Text('Ürün istemiyorum',
                    style: TextStyle(color: YpColors.bad)),
                style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: YpColors.badSoft)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _summary(Order? order, OrderWindow window) {
    if (order != null && order.status == OrderStatus.submitted) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(formatQty(order.units),
                  style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.2)),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text('adet',
                    style: TextStyle(
                        fontSize: 15,
                        color: YpColors.ink2,
                        fontWeight: FontWeight.w500)),
              ),
              const Spacer(),
              Text('${order.lines.length} çeşit ürün',
                  style: const TextStyle(fontSize: 13, color: YpColors.ink2)),
            ],
          ),
          const SizedBox(height: 4),
          Text('Son güncelleme ${formatDateTimeUtc(order.updatedAtUtc)}',
              style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
        ],
      );
    }
    if (order != null && order.status == OrderStatus.noProduct) {
      return const Text('Bu teslimat için ürün istemediniz.',
          style: TextStyle(
              fontSize: 15, color: YpColors.ink, fontWeight: FontWeight.w500));
    }
    if (order != null && order.status == OrderStatus.cancelled) {
      return const Text('Siparişiniz iptal edildi.',
          style: TextStyle(
              fontSize: 15, color: YpColors.ink, fontWeight: FontWeight.w500));
    }
    // Henüz sipariş yok.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Henüz sipariş girmediniz.',
            style: TextStyle(
                fontSize: 15, color: YpColors.ink, fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        Text(
            window.isOpen
                ? 'Sipariş alımı ${formatCutoffMinute(window.cutoffMinute)}\'a kadar açık.'
                : 'Sipariş penceresi kapalı.',
            style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
      ],
    );
  }
}

// ----------------------------------------------------------------- bayi bilgisi

class _InfoCard extends StatelessWidget {
  final CustomerBranch branch;
  const _InfoCard({required this.branch});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bayi bilgisi',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: YpColors.ink2)),
            const SizedBox(height: 12),
            _row(Icons.qr_code_2_rounded, 'Bayi Kodu', branch.customerCode),
            _row(Icons.store_mall_directory_outlined, 'Şube', branch.departmentName),
            _row(Icons.receipt_long_outlined, 'Vergi No', maskTax(branch.taxNumber)),
            if (branch.personnelName.isNotEmpty)
              _row(Icons.person_outline_rounded, 'Personel', branch.personnelName),
            _row(Icons.event_repeat_outlined, 'Dağıtım günleri',
                branch.distributionDays.isEmpty ? '–' : branch.distributionDays,
                last: true),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value, {bool last = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: last ? 0 : 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: YpColors.ink3),
          const SizedBox(width: 12),
          SizedBox(
            width: 120,
            child: Text(label,
                style: const TextStyle(fontSize: 13.5, color: YpColors.ink2)),
          ),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: YpColors.ink)),
          ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------- hata durumu

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
      children: [
        const Icon(Icons.cloud_off_rounded, size: 40, color: YpColors.ink3),
        const SizedBox(height: 14),
        Text(message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, color: YpColors.ink2, height: 1.4)),
        const SizedBox(height: 20),
        Center(
          child: FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded, size: 20),
            label: const Text('Tekrar dene'),
            style: FilledButton.styleFrom(minimumSize: const Size(160, 48)),
          ),
        ),
      ],
    );
  }
}
