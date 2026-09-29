"""Test VM'sinde MB 1592 müşteri API akışını sınar; parolayı kaydetmez.

Yalnızca 192.168.5.230:8443 test sunucusu ve mevcut OrderId 8 içindir.
Self-signed smoke sertifikası nedeniyle bu betikte sertifika doğrulaması kapalıdır.
Üretim istemcisi bu davranışı kullanmamalıdır.
"""

import getpass
import json
import ssl
import sys
import urllib.error
import urllib.request
import uuid


BASE = "https://192.168.5.230:8443/api/v1"
MB_ID = 1592
PRODUCT_ID = 75
VARIANT_ID = 0
ORDER_ID = 8
context = ssl._create_unverified_context()
opener = urllib.request.build_opener(
    urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=context)
)


def call(method, path, token=None, body=None, key=None):
    headers = {"Accept": "application/json", "X-Yepas-Client": "mobile-v1"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if key:
        headers["Idempotency-Key"] = key
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with opener.open(request, timeout=15) as response:
            payload = response.read()
            return response.status, json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        payload = error.read()
        try:
            detail = json.loads(payload) if payload else None
        except ValueError:
            detail = None
        return error.code, detail


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def target_line(lines):
    matches = [line for line in lines if line["uStokId"] == PRODUCT_ID
               and line["aStokId"] == VARIANT_ID]
    require(len(matches) == 1, "Beklenen ürün satırı bulunamadı veya birden fazla.")
    return matches[0]


def body_for(order, quantity):
    return {
        "revision": order["revision"],
        "status": "SUBMITTED",
        "note": order.get("note"),
        "lines": [
            {
                "uStokId": line["uStokId"],
                "aStokId": line["aStokId"],
                "quantity": quantity if line["uStokId"] == PRODUCT_ID
                and line["aStokId"] == VARIANT_ID else line["quantity"],
            }
            for line in order["lines"]
        ],
    }


def main():
    print("Yalnızca test VM: MB 1592 / OrderId 8. Parola ve token yazdırılmaz.")
    require(input("Test siparişini geçici olarak 2 -> 3 -> 2 güncellemek için TEST yaz: ").strip() == "TEST",
            "İşlem kullanıcı tarafından iptal edildi.")
    login_name = input("Müşteri kullanıcı adı [baskentmarket]: ").strip() or "baskentmarket"
    password = getpass.getpass("Müşteri parolası: ")
    token = None
    original_quantity = None
    original_order_id = None
    changed = False
    try:
        status, login = call("POST", "/auth/login", body={
            "loginName": login_name, "password": password, "role": "CUSTOMER"
        })
        password = None
        require(status == 200 and login and login.get("accessToken"),
                "Müşteri girişi başarısız (HTTP %s)." % status)
        require(login.get("role") == "CUSTOMER" and not login.get("mustChangePassword"),
                "Hesap rolü veya parola değiştirme durumu uygun değil.")
        token = login["accessToken"]
        print("1/7 Müşteri girişi başarılı.")

        status, branches = call("GET", "/customer/branches", token)
        require(status == 200 and isinstance(branches, list) and
                any(branch.get("legacyMbId") == MB_ID for branch in branches),
                "MB 1592 bu müşteri hesabına bağlı değil.")
        status, _ = call("GET", "/customer/branches/999999/order", token)
        require(status == 403, "Bağlı olmayan şube reddedilmedi (HTTP %s)." % status)
        print("2/7 Şube yetkisi ve yetkisiz şube reddi başarılı.")

        path = "/customer/branches/%s/order" % MB_ID
        status, order_context = call("GET", path, token)
        require(status == 200 and order_context.get("window", {}).get("isOpen"),
                "Sipariş bağlamı alınamadı veya pencere kapalı.")
        order = order_context.get("order")
        require(order and order.get("orderId") == ORDER_ID and order.get("status") == "SUBMITTED",
                "Beklenen test siparişi (OrderId 8) bulunamadı; hiçbir değişiklik yapılmadı.")
        original_quantity = target_line(order["lines"])["quantity"]
        original_order_id = order["orderId"]
        require(original_quantity == 2,
                "Beklenen başlangıç miktarı 2 değil; hiçbir değişiklik yapılmadı.")
        print("3/7 Var olan sipariş müşteri API'sinden okundu.")

        update = body_for(order, 3)
        key = str(uuid.uuid4())
        status, updated = call("PUT", path, token, update, key)
        changed = status == 200 and updated and updated.get("orderId") == ORDER_ID
        require(status == 200 and updated.get("orderId") == ORDER_ID and
                updated.get("revision") == order["revision"] + 1 and
                target_line(updated["lines"])["quantity"] == 3,
                "Müşteri güncellemesi beklenen sonucu vermedi (HTTP %s)." % status)
        print("4/7 Müşteri siparişi 2 -> 3 olarak güncellendi.")

        status, replay = call("PUT", path, token, update, key)
        require(status == 200 and replay.get("orderId") == ORDER_ID and
                replay.get("revision") == updated["revision"],
                "Aynı idempotency isteği ikinci revizyon oluşturdu.")
        print("5/7 Aynı istek tekrarında mükerrer revizyon oluşmadı.")

        status, _ = call("PUT", path, token, body_for(order, 4), key)
        require(status == 409, "Aynı anahtarla farklı gövde reddedilmedi (HTTP %s)." % status)
        status, _ = call("PUT", path, token, update, str(uuid.uuid4()))
        require(status == 409, "Eski revizyon reddedilmedi (HTTP %s)." % status)
        print("6/7 Idempotency çakışması ve eski revizyon reddedildi.")
    finally:
        try:
            if token and original_quantity is not None:
                # Başarısız PUT yanıtında da DB değişmiş olabilir; mevcut hali tekrar oku.
                status, current = call("GET", "/customer/branches/%s/order" % MB_ID, token)
                current_order = current.get("order") if status == 200 and current else None
                if current_order and current_order.get("orderId") == original_order_id and \
                        target_line(current_order["lines"])["quantity"] == 3:
                    restore = body_for(current_order, original_quantity)
                    restore_status, restored = call("PUT", "/customer/branches/%s/order" % MB_ID,
                                                    token, restore, str(uuid.uuid4()))
                    require(restore_status == 200 and
                            target_line(restored["lines"])["quantity"] == original_quantity,
                            "Miktar geri alınamadı; OrderId 8'i kontrol edin.")
                    print("7/7 Miktar yeniden 2 oldu. Ara tablo PENDING kalır; admin tekrar aktarmalı.")
                elif changed:
                    print("UYARI: Geri alma öncesi sipariş değişmiş; OrderId 8'i elle kontrol edin.")
        finally:
            if token:
                try:
                    call("POST", "/auth/logout", token)
                except Exception:
                    print("UYARI: Çıkış isteği tamamlanamadı.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("BAŞARISIZ: %s" % error)
        sys.exit(1)
