import 'dart:async';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import '../widgets/branch_switcher.dart';
import '../widgets/status_badge.dart';
import 'order_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final app = AppScope.of(context);
        app.refreshSystemStatus();
        app.refreshOrderContext();
      }
    });
    // Kalan süre yazısı dakikası dakikasına güncellenir.
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final customer = app.currentCustomer;
    if (customer == null) return const SizedBox.shrink();

    final order = app.orderFor(customer.id);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(customer.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3)),
            Text(
              app.hasMultipleBranches
                  ? '${customer.branchNo}. Şube · ${customer.district}'
                  : '${customer.code} · ${customer.district}',
              style: const TextStyle(
                  fontSize: 12.5,
                  color: YpColors.ink2,
                  fontWeight: FontWeight.w400),
            ),
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
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          if (app.orderContextLoading) const LinearProgressIndicator(),
          if (app.orderContextError != null)
            Padding(
                padding: const EdgeInsets.all(12),
                child: Text(app.orderContextError!)),
          if (!app.orderWindowOpen &&
              !app.orderContextLoading &&
              app.orderContextError == null)
            const _ClosedBanner(),
          _OrderStatusCard(customer: customer, order: order),
        ],
      ),
    );
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
              'Sipariş alımı şu an kapalı. Yeni sipariş girişi veya değişiklik yapılamıyor.',
              style:
                  TextStyle(fontSize: 13.5, color: YpColors.ink, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------- "Alındı" onay kutusu

/// Müşterinin bildirimi alındı bilgisini metin kutusu gibi gösterir
/// ("Alındı · Sipariş istenmedi").
class _ReceivedBox extends StatelessWidget {
  final String text;
  const _ReceivedBox({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: YpColors.surface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: YpColors.hairline),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, size: 18, color: YpColors.ok),
          const SizedBox(width: 8),
          const Text('Alındı',
              style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: YpColors.ink)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 14.5, color: YpColors.ink2)),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------- yarının sipariş kartı

class _OrderStatusCard extends StatelessWidget {
  final Customer customer;
  final DailyOrder? order;
  const _OrderStatusCard({required this.customer, required this.order});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final status = order?.status ?? OrderStatus.pending;
    final units = order?.units ?? 0;
    final lineCount = order?.lines.length ?? 0;
    final open = app.orderWindowOpen &&
        !app.orderContextLoading &&
        app.orderContextError == null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Yarının siparişi',
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
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Icon(Icons.local_shipping_rounded,
                    size: 17, color: YpColors.ink3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                      app.deliveryDate?.split('T').first ??
                          'Teslim tarihi yükleniyor',
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (status == OrderStatus.ordered) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(formatQty(units),
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
                  Text('$lineCount çeşit ürün',
                      style:
                          const TextStyle(fontSize: 13, color: YpColors.ink2)),
                ],
              ),
              if (order?.updatedAt != null) ...[
                const SizedBox(height: 4),
                Text('Son güncelleme ${order!.updatedAt}',
                    style:
                        const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
              ],
              if (open) ...[
                const SizedBox(height: 4),
                Text(_cutoffHint(app),
                    style:
                        const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
              ],
            ] else if (status == OrderStatus.declined) ...[
              const _ReceivedBox(text: 'Sipariş istenmedi'),
            ] else ...[
              const Text('Henüz sipariş girmediniz.',
                  style: TextStyle(
                      fontSize: 15,
                      color: YpColors.ink,
                      fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text(_cutoffHint(app),
                  style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: open
                  ? () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OrderScreen()),
                      )
                  : null,
              icon: Icon(
                  status == OrderStatus.ordered
                      ? Icons.edit_rounded
                      : Icons.add_rounded,
                  size: 20),
              label: Text(status == OrderStatus.ordered
                  ? 'Siparişi düzenle'
                  : 'Sipariş oluştur'),
            ),
            if (open && status != OrderStatus.declined) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _confirmDecline(context, app),
                icon: const Icon(Icons.do_not_disturb_on_outlined,
                    size: 19, color: YpColors.bad),
                label: const Text('Yarın ürün istemiyorum',
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

  /// Kesim saatine yaklaşıldığında kalan süreyi, uzaksa saati yazar.
  static String _cutoffHint(AppState app) {
    final remaining = app.minutesUntilCutoff();
    if (remaining == null)
      return 'Sipariş alımı ${app.cutoffTime} saatinde kapanır.';
    if (remaining > 180)
      return 'Sipariş alımı ${app.cutoffTime}\'a kadar açık.';
    if (remaining < 1)
      return 'Yarın teslim edilecek sipariş için 1 dakikadan az kaldı.';
    if (remaining < 60) {
      return 'Yarın teslim edilecek sipariş için $remaining dk kaldı.';
    }
    final hours = remaining ~/ 60;
    final minutes = remaining % 60;
    return minutes == 0
        ? 'Yarın teslim edilecek sipariş için $hours sa kaldı.'
        : 'Yarın teslim edilecek sipariş için $hours sa $minutes dk kaldı.';
  }

  Future<void> _confirmDecline(BuildContext context, AppState app) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yarın ürün istemiyor musunuz?'),
        content: const Text(
            'Bu gün için siparişiniz kapatılacak. Dilerseniz kesim saatine kadar tekrar sipariş girebilirsiniz.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: YpColors.bad, minimumSize: const Size(64, 42)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Evet, istemiyorum'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      final error = await app.declineOrder(customer.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error ?? 'Yarın için ürün istenmediği kaydedildi.')));
    }
  }
}
