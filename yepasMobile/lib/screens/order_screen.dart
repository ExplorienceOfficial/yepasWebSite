import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/seed_data.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import '../widgets/qty_stepper.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  final Map<String, int> _draft = {};
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loaded) return;
    final app = AppScope.of(context);
    final order = app.orderFor(app.currentCustomerId!);
    if (order != null) {
      for (final line in order.lines) {
        _draft[line.productId] = line.qty;
      }
    }
    _loaded = true;
  }

  int get _totalUnits => _draft.values.fold(0, (s, v) => s + v);
  int get _lineCount => _draft.values.where((v) => v > 0).length;

  void _setQty(String productId, int qty) {
    setState(() {
      if (qty <= 0) {
        _draft.remove(productId);
      } else {
        _draft[productId] = qty;
      }
    });
  }

  Future<void> _editExact(Product p) async {
    final app = AppScope.of(context);
    final max = app.maxQtyFor(p.id);
    final controller = TextEditingController(text: (_draft[p.id] ?? '').toString());
    final result = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(p.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('En fazla ${formatQty(max)} adet',
                style: const TextStyle(fontSize: 13, color: YpColors.ink2)),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                suffixText: 'adet',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onSubmitted: (v) => Navigator.pop(ctx, int.tryParse(v) ?? 0),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Vazgeç')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(64, 42)),
            onPressed: () => Navigator.pop(ctx, int.tryParse(controller.text) ?? 0),
            child: const Text('Uygula'),
          ),
        ],
      ),
    );
    if (result != null) _setQty(p.id, result.clamp(0, max));
  }

  void _save() {
    final app = AppScope.of(context);
    if (_totalUnits == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('En az bir ürün için adet girin.')),
      );
      return;
    }
    app.submitOrder(app.currentCustomerId!, Map.of(_draft));
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sipariş kaydedildi · ${formatQty(_totalUnits)} adet')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final ruleLabel = app.orderRule == OrderRule.average ? 'Geçmiş ortalama' : 'Sabit limit';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sipariş oluştur'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(38),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
            child: Row(
              children: [
                const Icon(Icons.local_shipping_outlined, size: 15, color: YpColors.ink3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('Teslimat: $kOrderDate',
                      style: const TextStyle(fontSize: 12.5, color: YpColors.ink2, fontWeight: FontWeight.w500)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: YpColors.surface3, borderRadius: BorderRadius.circular(999)),
                  child: Text('Üst sınır: $ruleLabel',
                      style: const TextStyle(fontSize: 11.5, color: YpColors.ink2, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        itemCount: app.categories.length,
        itemBuilder: (context, index) {
          final cat = app.categories[index];
          final items = app.productsInCategory(cat.id);
          return _CategorySection(
            category: cat,
            children: [
              for (final p in items)
                _ProductRow(
                  product: p,
                  qty: _draft[p.id] ?? 0,
                  max: app.maxQtyFor(p.id),
                  onChanged: (v) => _setQty(p.id, v),
                  onTapValue: () => _editExact(p),
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: _SaveBar(
        totalUnits: _totalUnits,
        lineCount: _lineCount,
        onSave: _save,
      ),
    );
  }
}

// -------------------------------------------------------------- kategori bölümü

class _CategorySection extends StatelessWidget {
  final ProductCategory category;
  final List<Widget> children;
  const _CategorySection({required this.category, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(category.name,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
              Text(category.line, style: const TextStyle(fontSize: 12, color: YpColors.ink3)),
            ],
          ),
        ),
        Card(
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const Divider(indent: 76),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ----------------------------------------------------------------- ürün satırı

class _ProductRow extends StatelessWidget {
  final Product product;
  final int qty;
  final int max;
  final ValueChanged<int> onChanged;
  final VoidCallback onTapValue;

  const _ProductRow({
    required this.product,
    required this.qty,
    required this.max,
    required this.onChanged,
    required this.onTapValue,
  });

  @override
  Widget build(BuildContext context) {
    final selected = qty > 0;
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.asset(
              product.imageAsset,
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
                Text(product.name,
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: selected ? YpColors.ink : YpColors.ink)),
                const SizedBox(height: 2),
                Text('${product.code} · en fazla ${formatQty(max)}',
                    style: const TextStyle(fontSize: 12, color: YpColors.ink3)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          QtyStepper(
            value: qty,
            max: max,
            onChanged: onChanged,
            onTapValue: onTapValue,
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------------ kaydet çubuğu

class _SaveBar extends StatelessWidget {
  final int totalUnits;
  final int lineCount;
  final VoidCallback onSave;

  const _SaveBar({required this.totalUnits, required this.lineCount, required this.onSave});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: YpColors.surface,
        border: Border(top: BorderSide(color: YpColors.hairline)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('${formatQty(totalUnits)} adet',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                  Text('$lineCount çeşit ürün',
                      style: const TextStyle(fontSize: 12.5, color: YpColors.ink2)),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onSave,
                  icon: const Icon(Icons.check_rounded, size: 20),
                  label: const Text('Siparişi kaydet'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
