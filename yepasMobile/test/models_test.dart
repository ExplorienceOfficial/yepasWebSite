import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:yepas_mobile/models/models.dart';

void main() {
  test('LoginResponse ayrıştırılır (README §1)', () {
    final json = jsonDecode('''
      {
        "userId": 12,
        "loginName": "musteri-kullanici-adi",
        "role": "CUSTOMER",
        "legacyPersonnelId": null,
        "mustChangePassword": false,
        "accessToken": "abc.def"
      }
    ''') as Map<String, dynamic>;

    final res = LoginResult.fromJson(json);
    expect(res.identity.userId, 12);
    expect(res.identity.loginName, 'musteri-kullanici-adi');
    expect(res.identity.role, 'CUSTOMER');
    expect(res.identity.legacyPersonnelId, isNull);
    expect(res.mustChangePassword, isFalse);
    expect(res.accessToken, 'abc.def');
  });

  test('CustomerOrderContext: pencere + ürün + null sipariş (README §3)', () {
    final json = jsonDecode('''
      {
        "legacyMbId": 1592,
        "deliveryDate": "2026-09-19T00:00:00",
        "window": {
          "isOpen": true,
          "mode": "AUTO",
          "cutoffMinute": 1080,
          "deadlineUtc": "2026-09-18T15:00:00Z",
          "overrideUntilUtc": null
        },
        "products": [
          {
            "uStokId": 75, "aStokId": 0, "code": "013.002",
            "name": "100 GR DÖNER EKMEK", "groupId": 0,
            "variantName": null, "maxQuantity": 100
          },
          {
            "uStokId": 80, "aStokId": 0, "code": "013.010",
            "name": "SOMUN", "groupId": 0, "variantName": null, "maxQuantity": 0
          }
        ],
        "order": null
      }
    ''') as Map<String, dynamic>;

    final ctx = CustomerOrderContext.fromJson(json);
    expect(ctx.legacyMbId, 1592);
    // Teslim tarihi takvim günüdür; saat dilimi kaydırması yapılmaz.
    expect(ctx.deliveryDate.year, 2026);
    expect(ctx.deliveryDate.month, 9);
    expect(ctx.deliveryDate.day, 19);
    expect(ctx.window.isOpen, isTrue);
    expect(ctx.window.cutoffMinute, 1080);
    expect(ctx.products.length, 2);
    expect(ctx.products.first.key, '75:0');
    expect(ctx.products.first.unlimited, isFalse);
    expect(ctx.products.first.cap, 100);
    // maxQuantity 0 → sınırsız.
    expect(ctx.products[1].unlimited, isTrue);
    expect(ctx.products[1].cap, 100000);
    expect(ctx.order, isNull);
  });

  test('Order ve durum eşlemesi', () {
    final json = jsonDecode('''
      {
        "orderId": 5, "legacyMbId": 1592,
        "deliveryDate": "2026-09-19T00:00:00",
        "status": "SUBMITTED", "revision": 1, "note": null,
        "updatedAtUtc": "2026-09-18T09:00:00Z",
        "lines": [
          {"uStokId": 75, "aStokId": 0, "quantity": 10,
           "productCode": "013.002", "productName": "100 GR DÖNER EKMEK", "variantName": null}
        ]
      }
    ''') as Map<String, dynamic>;

    final order = Order.fromJson(json);
    expect(order.status, OrderStatus.submitted);
    expect(order.revision, 1);
    expect(order.units, 10);
    expect(order.lines.single.key, '75:0');
  });

  test('SaveOrderRequest.toJson sözleşmeye uyar', () {
    const req = SaveOrderRequest(
      revision: 0,
      status: OrderStatus.submitted,
      note: 'İsteğe bağlı not',
      lines: [OrderLineInput(uStokId: 75, aStokId: 0, quantity: 10)],
    );
    final map = req.toJson();
    expect(map['revision'], 0);
    expect(map['status'], 'SUBMITTED');
    expect(map['note'], 'İsteğe bağlı not');
    expect((map['lines'] as List).single,
        {'uStokId': 75, 'aStokId': 0, 'quantity': 10});
  });

  test('NO_PRODUCT / CANCELLED wire değerleri', () {
    expect(OrderStatus.noProduct.wire, 'NO_PRODUCT');
    expect(OrderStatus.cancelled.wire, 'CANCELLED');
    expect(OrderStatus.fromWire('NO_PRODUCT'), OrderStatus.noProduct);
    expect(OrderStatus.fromWire('CANCELLED'), OrderStatus.cancelled);
    expect(OrderStatus.fromWire(null), OrderStatus.submitted);
  });
}
