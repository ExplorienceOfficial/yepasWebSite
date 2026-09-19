import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/api_exception.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/dates.dart';
import '../utils/format.dart';
import '../utils/ids.dart';
import '../widgets/qty_stepper.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  /// Ürün anahtarı ("uStok:aStok") → adet.
  final Map<String, int> _draft = {};
  bool _loaded = false;
  bool _saving = false;

  // Idempotency: aynı gövde ağ hatasıyla tekrarlanırsa aynı anahtar kullanılır.
  String? _idemKey;
  String _idemSignature = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loaded) return;
    _loadFromContext(AppScope.of(context).context);
    _loaded = true;
  }

  void _loadFromContext(CustomerOrderContext? ctx) {
    _draft.clear();
    final order = ctx?.order;
    if (order != null && order.status == OrderStatus.submitted) {
      for (final line in order.lines) {
        _draft['${line.uStokId}:${line.aStokId}'] = line.quantity;
      }
    }
  }

  int get _totalUnits => _draft.values.fold(0, (s, v) => s + v);
  int get _lineCount => _draft.values.where((v) => v > 0).length;

  void _setQty(Product p, int qty) {
    setState(() {
      final clamped = qty.clamp(0, p.cap);
      if (clamped <= 0) {
        _draft.remove(p.key);
      } else {
        _draft[p.key] = clamped;
      }
    });
  }

  Future<void> _editExact(Product p) async {
    final controller =
        TextEditingController(text: (_draft[p.key] ?? '').toString());
    final result = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(p.displayName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(p.unlimited ? 'Adet girin' : 'En fazla ${formatQty(p.maxQuantity)} adet',
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
    if (result != null) _setQty(p, result);
  }

  Future<void> _save() async {
    final app = AppScope.of(context);
    final ctx = app.context;
    if (ctx == null) return;

    if (!ctx.window.isOpen) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sipariş penceresi kapalı.')),
      );
      return;
    }
    if (_totalUnits == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('En az bir ürün için adet girin.')),
      );
      return;
    }

    final lines = <OrderLineInput>[];
    for (final p in ctx.products) {
      final q = _draft[p.key] ?? 0;
      if (q > 0) {
        lines.add(OrderLineInput(uStokId: p.uStokId, aStokId: p.aStokId, quantity: q));
      }
    }
    final revision = ctx.order?.revision ?? 0;

    // Gövde değişmediyse aynı idempotency anahtarını koru (README §7).
    final signature = '$revision|'
        '${(lines.toList()..sort((a, b) => a.uStokId != b.uStokId ? a.uStokId.compareTo(b.uStokId) : a.aStokId.compareTo(b.aStokId))).map((l) => '${l.uStokId}:${l.aStokId}=${l.quantity}').join(',')}';
    if (_idemKey == null || signature != _idemSignature) {
      _idemKey = uuidV4();
      _idemSignature = signature;
    }

    setState(() => _saving = true);
    try {
      final order = await app.submitOrder(
        lines: lines,
        revision: revision,
        idempotencyKey: _idemKey!,
      );
      _idemKey = null;
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sipariş kaydedildi · ${formatQty(order.units)} adet')),
      );
    } on ApiException catch (e) {
      if (!e.isNetwork) _idemKey = null; // ağ dışı hata: anahtar tüketildi
      if (!mounted) return;

      if (e.revisionConflict) {
        await app.refreshContext();
        if (!mounted) return;
        setState(() => _loadFromContext(app.context));
        await _showInfo('Sipariş güncellendi',
            'Sipariş bu sırada başka bir yerden değiştirilmiş. En son hali yüklendi, lütfen kontrol edip tekrar kaydedin.');
      } else if (e.windowClosed || e.finalized) {
        await app.refreshContext();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.userMessage)));
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.userMessage)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showInfo(String title, String body) => showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(64, 42)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Tamam')),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final ctx = app.context;
    final products = ctx?.products ?? const <Product>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sipariş oluştur'),
        bottom: ctx == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(34),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping_outlined,
                          size: 15, color: YpColors.ink3),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text('Teslimat: ${formatDeliveryDate(ctx.deliveryDate)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12.5,
                                color: YpColors.ink2,
                                fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                ),
              ),
      ),
      body: products.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Bu şube için tanımlı ürün bulunmuyor.',
                    style: TextStyle(color: YpColors.ink2)),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
              children: [
                Card(
                  child: Column(
                    children: [
                      for (var i = 0; i < products.length; i++) ...[
                        if (i > 0) const Divider(indent: 16, endIndent: 16, height: 1),
                        _ProductRow(
                          product: products[i],
                          qty: _draft[products[i].key] ?? 0,
                          onChanged: (v) => _setQty(products[i], v),
                          onTapValue: () => _editExact(products[i]),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
      bottomNavigationBar: _SaveBar(
        totalUnits: _totalUnits,
        lineCount: _lineCount,
        saving: _saving,
        onSave: _save,
      ),
    );
  }
}

// ----------------------------------------------------------------- ürün satırı

class _ProductRow extends StatelessWidget {
  final Product product;
  final int qty;
  final ValueChanged<int> onChanged;
  final VoidCallback onTapValue;

  const _ProductRow({
    required this.product,
    required this.qty,
    required this.onChanged,
    required this.onTapValue,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: YpColors.surface3, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.bakery_dining_rounded, color: YpColors.ink3),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.displayName,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                    product.unlimited
                        ? product.code
                        : '${product.code} · en fazla ${formatQty(product.maxQuantity)}',
                    style: const TextStyle(fontSize: 12, color: YpColors.ink3)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          QtyStepper(
            value: qty,
            max: product.cap,
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
  final bool saving;
  final VoidCallback onSave;

  const _SaveBar({
    required this.totalUnits,
    required this.lineCount,
    required this.saving,
    required this.onSave,
  });

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
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5)),
                  Text('$lineCount çeşit ürün',
                      style: const TextStyle(fontSize: 12.5, color: YpColors.ink2)),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton.icon(
                  onPressed: saving ? null : onSave,
                  icon: saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.2, color: Colors.white))
                      : const Icon(Icons.check_rounded, size: 20),
                  label: Text(saving ? 'Kaydediliyor…' : 'Siparişi kaydet'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
