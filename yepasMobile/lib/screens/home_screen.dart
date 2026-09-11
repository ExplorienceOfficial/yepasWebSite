import 'package:flutter/material.dart';

import '../data/seed_data.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import '../widgets/branch_switcher.dart';
import '../widgets/status_badge.dart';
import 'delivery_screen.dart';
import 'order_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final customer = app.currentCustomer;
    if (customer == null) return const SizedBox.shrink();

    final order = app.orderFor(customer.id);
    final driver = app.driverById(customer.driverId);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(customer.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
            Text(
              app.hasMultipleBranches
                  ? '${customer.branchNo}. Şube · ${customer.district}'
                  : '${customer.code} · ${customer.district}',
              style: const TextStyle(fontSize: 12.5, color: YpColors.ink2, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          if (app.hasMultipleBranches)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                avatar: const Icon(Icons.swap_horiz_rounded, size: 18, color: YpColors.accent),
                label: const Text('Şube'),
                labelStyle: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.accent),
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
          if (!app.orderSystemOpen) const _ClosedBanner(),
          _OrderStatusCard(customer: customer, order: order),
          const SizedBox(height: 14),
          _DeliveryCard(customer: customer),
          const SizedBox(height: 14),
          _InfoCard(customer: customer, driver: driver),
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
              style: TextStyle(fontSize: 13.5, color: YpColors.ink, height: 1.35),
            ),
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
    final open = app.orderSystemOpen;

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
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
                ),
                StatusBadge(status),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Icon(Icons.local_shipping_rounded, size: 17, color: YpColors.ink3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(kOrderDate,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: -0.2)),
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
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, letterSpacing: -1.2)),
                  const SizedBox(width: 6),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 6),
                    child: Text('adet', style: TextStyle(fontSize: 15, color: YpColors.ink2, fontWeight: FontWeight.w500)),
                  ),
                  const Spacer(),
                  Text('$lineCount çeşit ürün',
                      style: const TextStyle(fontSize: 13, color: YpColors.ink2)),
                ],
              ),
              if (order?.updatedAt != null) ...[
                const SizedBox(height: 4),
                Text('Son güncelleme ${order!.updatedAt}',
                    style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
              ],
            ] else if (status == OrderStatus.declined) ...[
              const Text('Yarın için ürün istemediniz.',
                  style: TextStyle(fontSize: 15, color: YpColors.ink, fontWeight: FontWeight.w500)),
            ] else ...[
              const Text('Henüz sipariş girmediniz.',
                  style: TextStyle(fontSize: 15, color: YpColors.ink, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text('Sipariş alımı $kOrderCutoff\'a kadar açık.',
                  style: const TextStyle(fontSize: 12.5, color: YpColors.ink3)),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: open
                  ? () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OrderScreen()),
                      )
                  : null,
              icon: Icon(status == OrderStatus.ordered ? Icons.edit_rounded : Icons.add_rounded, size: 20),
              label: Text(status == OrderStatus.ordered ? 'Siparişi düzenle' : 'Sipariş oluştur'),
            ),
            if (open && status != OrderStatus.declined) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _confirmDecline(context, app),
                icon: const Icon(Icons.do_not_disturb_on_outlined, size: 19, color: YpColors.bad),
                label: const Text('Yarın ürün istemiyorum', style: TextStyle(color: YpColors.bad)),
                style: OutlinedButton.styleFrom(side: const BorderSide(color: YpColors.badSoft)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDecline(BuildContext context, AppState app) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yarın ürün istemiyor musunuz?'),
        content: const Text('Bu gün için siparişiniz kapatılacak. Dilerseniz kesim saatine kadar tekrar sipariş girebilirsiniz.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: YpColors.bad, minimumSize: const Size(64, 42)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Evet, istemiyorum'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      app.declineOrder(customer.id);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Yarın için sipariş kapatıldı.')),
      );
    }
  }
}

// -------------------------------------------------------- bugün teslim kartı

class _DeliveryCard extends StatelessWidget {
  final Customer customer;
  const _DeliveryCard({required this.customer});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final delivery = app.deliveryFor(customer.id);
    final units = delivery?.units ?? 0;
    final hasDelivery = delivery != null && delivery.status == OrderStatus.ordered && units > 0;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: hasDelivery
            ? () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const DeliveryScreen()),
                )
            : null,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: YpColors.accentSoft, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.inventory_2_rounded, color: YpColors.accent, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bugün teslim edilecek',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
                    const SizedBox(height: 3),
                    Text(
                      hasDelivery ? '${formatQty(units)} adet · $kDeliveryDate' : 'Bugün teslimat planı yok',
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, letterSpacing: -0.2),
                    ),
                  ],
                ),
              ),
              if (hasDelivery) const Icon(Icons.chevron_right_rounded, color: YpColors.ink3),
            ],
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------- bayi bilgisi

class _InfoCard extends StatelessWidget {
  final Customer customer;
  final Driver? driver;
  const _InfoCard({required this.customer, required this.driver});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bayi bilgisi',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2)),
            const SizedBox(height: 12),
            _row(Icons.badge_outlined, 'Tür', customer.type),
            _row(Icons.person_outline_rounded, 'Yetkili', customer.contact),
            _row(Icons.phone_outlined, 'Telefon', customer.phone),
            if (driver != null)
              _row(Icons.local_shipping_outlined, 'Şoför', '${driver!.name} · ${driver!.plate}'),
            _row(Icons.route_outlined, 'Teslimat sırası', '${driver?.region ?? '-'} · ${customer.stopNo}. durak',
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
            width: 110,
            child: Text(label, style: const TextStyle(fontSize: 13.5, color: YpColors.ink2)),
          ),
          Expanded(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: YpColors.ink)),
          ),
        ],
      ),
    );
  }
}
