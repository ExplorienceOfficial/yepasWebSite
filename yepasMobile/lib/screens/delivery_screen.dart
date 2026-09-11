import 'package:flutter/material.dart';

import '../data/seed_data.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';

class DeliveryScreen extends StatelessWidget {
  const DeliveryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final customer = app.currentCustomer!;
    final delivery = app.deliveryFor(customer.id);
    final lines = delivery?.lines ?? const [];

    return Scaffold(
      appBar: AppBar(title: const Text('Bugünkü teslimat')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: YpColors.accentSoft, borderRadius: BorderRadius.circular(14)),
            child: Row(
              children: [
                const Icon(Icons.event_available_rounded, color: YpColors.accent, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('$kDeliveryDate\nKesinleşmiş sipariş — değiştirilemez.',
                      style: const TextStyle(fontSize: 13, color: YpColors.ink, height: 1.4)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                for (var i = 0; i < lines.length; i++) ...[
                  if (i > 0) const Divider(indent: 76),
                  _line(app, lines[i].productId, lines[i].qty),
                ],
                if (lines.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Bugün için teslimat kaydı bulunmuyor.',
                        style: TextStyle(color: YpColors.ink2)),
                  ),
              ],
            ),
          ),
          if (lines.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              decoration: BoxDecoration(
                color: YpColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: YpColors.hairline),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Toplam', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('${formatQty(delivery!.units)} adet',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _line(AppState app, String productId, int qty) {
    final p = app.productById(productId);
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset(
              p?.imageAsset ?? '',
              width: 52,
              height: 52,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 52,
                height: 52,
                color: YpColors.surface3,
                child: const Icon(Icons.bakery_dining_rounded, color: YpColors.ink3),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p?.name ?? productId,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(p?.code ?? '', style: const TextStyle(fontSize: 12, color: YpColors.ink3)),
              ],
            ),
          ),
          Text('${formatQty(qty)} adet',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: YpColors.ink)),
        ],
      ),
    );
  }
}
