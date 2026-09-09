import type {
  Customer,
  DailyOrder,
  Driver,
  OrderLine,
  OrderRule,
  Product,
  ProductCategory,
  SyncRecord,
} from "@/types";

/** Bugün dağıtılacak (dün verilen) siparişlerin günü */
export const DELIVERY_DATE = "9 Eylül 2026, Çarşamba";
/** Bugün verilen (yarın dağıtılacak) siparişlerin günü */
export const ORDER_DATE = "10 Eylül 2026, Perşembe";
/** Genel operasyon günü etiketi */
export const OPERATION_DATE = ORDER_DATE;
export const ORDER_CUTOFF = "17:30";

/** Maksimum sipariş adedi kuralı varsayılanları */
export const DEFAULT_ORDER_RULE: OrderRule = "limit";
export const DEFAULT_MAX_QTY = 1200;

export const categories: ProductCategory[] = [
  { id: "cat-gunluk", name: "Günlük Ekmek", line: "Tava Hattı · Fırın 1" },
  { id: "cat-roll", name: "Roll Ekmek", line: "Otomatik Roll Hattı" },
  { id: "cat-sandvic", name: "Sandviç & Burger", line: "Sandviç Hattı" },
  { id: "cat-ozel", name: "Geleneksel & Özel", line: "Taş Fırın" },
];

export const products: Product[] = [
  // --- Günlük Ekmek ---
  { id: "p01", categoryId: "cat-gunluk", name: "3 Çizgili Üstü", code: "EKM-301", maxOrderLimit: 600, avgOrder: 140, imageUrl: "/urunler/9.jpg" },
  { id: "p02", categoryId: "cat-gunluk", name: "Kepekli", code: "EKM-302", maxOrderLimit: 400, avgOrder: 60, imageUrl: "/urunler/2.jpg" },
  { id: "p03", categoryId: "cat-gunluk", name: "Tam Buğday", code: "EKM-303", maxOrderLimit: 300, avgOrder: 45, imageUrl: "/urunler/3.jpg" },
  { id: "p04", categoryId: "cat-gunluk", name: "Tava Ekmek", code: "EKM-304", maxOrderLimit: 500, avgOrder: 90, imageUrl: "/urunler/9.jpg" },
  // --- Roll Ekmek ---
  { id: "p05", categoryId: "cat-roll", name: "Sade Roll", code: "ROL-101", maxOrderLimit: 1200, avgOrder: 250, imageUrl: "/urunler/1.jpg" },
  { id: "p06", categoryId: "cat-roll", name: "Kepekli Roll", code: "ROL-102", maxOrderLimit: 800, avgOrder: 120, imageUrl: "/urunler/2.jpg" },
  { id: "p07", categoryId: "cat-roll", name: "Tam Buğday Roll", code: "ROL-103", maxOrderLimit: 800, avgOrder: 100, imageUrl: "/urunler/3.jpg" },
  { id: "p08", categoryId: "cat-roll", name: "Çavdarlı Roll", code: "ROL-104", maxOrderLimit: 600, avgOrder: 80, imageUrl: "/urunler/4.jpg" },
  { id: "p09", categoryId: "cat-roll", name: "Tuzsuz Roll", code: "ROL-105", maxOrderLimit: 400, avgOrder: 40, imageUrl: "/urunler/5.jpg" },
  { id: "p10", categoryId: "cat-roll", name: "Ayçekirdekli Roll", code: "ROL-106", maxOrderLimit: 600, avgOrder: 70, imageUrl: "/urunler/6.jpg" },
  // --- Sandviç & Burger ---
  { id: "p11", categoryId: "cat-sandvic", name: "Susamlı Sandviç", code: "SND-201", maxOrderLimit: 700, avgOrder: 130, imageUrl: "/urunler/7.jpg" },
  { id: "p12", categoryId: "cat-sandvic", name: "Susamlı Hamburger", code: "SND-202", maxOrderLimit: 900, avgOrder: 180, imageUrl: "/urunler/8.jpg" },
  { id: "p13", categoryId: "cat-sandvic", name: "Cepli Pita", code: "SND-203", maxOrderLimit: 500, avgOrder: 60, imageUrl: "/urunler/12.jpg" },
  // --- Geleneksel & Özel ---
  { id: "p14", categoryId: "cat-ozel", name: "Baston Somun", code: "OZL-401", maxOrderLimit: 300, avgOrder: 55, imageUrl: "/urunler/9.jpg" },
  { id: "p15", categoryId: "cat-ozel", name: "Taş Fırın Köy Ekmeği", code: "OZL-402", maxOrderLimit: 200, avgOrder: 35, imageUrl: "/urunler/10.jpg" },
  { id: "p16", categoryId: "cat-ozel", name: "Zeytinli & Otlu Ciabatta", code: "OZL-403", maxOrderLimit: 250, avgOrder: 30, imageUrl: "/urunler/11.jpg" },
  { id: "p17", categoryId: "cat-ozel", name: "Ekşi Mayalı Somun", code: "OZL-404", maxOrderLimit: 150, avgOrder: 18, imageUrl: "/urunler/10.jpg" },
];

export const drivers: Driver[] = [
  { id: "d1", code: "SFR-01", name: "Hakan Demir", phone: "0532 411 08 22", plate: "06 YPS 401", region: "Kızılay · Ulus", pin: "1401" },
  { id: "d2", code: "SFR-02", name: "Mustafa Yılmaz", phone: "0533 260 77 14", plate: "06 YPS 118", region: "Bahçelievler · Balgat", pin: "1118" },
  { id: "d3", code: "SFR-03", name: "Erkan Şahin", phone: "0542 815 33 90", plate: "06 YPS 232", region: "Keçiören · Etlik", pin: "1232" },
  { id: "d4", code: "SFR-04", name: "Serkan Aydın", phone: "0505 774 12 63", plate: "06 YPS 305", region: "Sincan · Etimesgut", pin: "1305" },
  { id: "d5", code: "SFR-05", name: "Bülent Koç", phone: "0536 903 45 71", plate: "06 YPS 417", region: "Mamak · Natoyolu", pin: "1417" },
];

export const customers: Customer[] = [
  { id: "c01", code: "MI-1042", name: "Bereket Market Kızılay", type: "Market", district: "Kızılay", contact: "Ramazan Öz", phone: "0312 418 22 10", driverId: "d1", stopNo: 1 },
  { id: "c02", code: "MI-1043", name: "Anafartalar Bakkaliye", type: "Bakkal", district: "Ulus", contact: "Sevgi Tan", phone: "0312 310 55 04", driverId: "d1", stopNo: 2 },
  { id: "c03", code: "MI-1044", name: "Grand Ankara Otel", type: "Otel", district: "Kızılay", contact: "Deniz Arel", phone: "0312 455 90 00", driverId: "d1", stopNo: 3 },
  { id: "c04", code: "MI-1045", name: "Sakarya Çorba & Kebap", type: "Restoran", district: "Sakarya", contact: "Hüseyin Ak", phone: "0312 433 17 60", driverId: "d1", stopNo: 4 },
  { id: "c05", code: "MI-1046", name: "Kuğulu Kafe", type: "Kafe", district: "Kavaklıdere", contact: "Ece Baran", phone: "0312 427 88 31", driverId: "d1", stopNo: 5 },

  { id: "c06", code: "MI-2011", name: "Öz Bahçelievler Market", type: "Market", district: "Bahçelievler", contact: "Yalçın Er", phone: "0312 213 44 09", driverId: "d2", stopNo: 1 },
  { id: "c07", code: "MI-2012", name: "Emek Şarküteri", type: "Bakkal", district: "Emek", contact: "Nurten Sarı", phone: "0312 215 76 22", driverId: "d2", stopNo: 2 },
  { id: "c08", code: "MI-2013", name: "Beşevler Öğrenci Yurdu", type: "Kurum", district: "Beşevler", contact: "İlker Tunç", phone: "0312 222 10 40", driverId: "d2", stopNo: 3 },
  { id: "c09", code: "MI-2014", name: "Balgat Burger House", type: "Restoran", district: "Balgat", contact: "Cem Kaya", phone: "0312 285 63 18", driverId: "d2", stopNo: 4 },
  { id: "c10", code: "MI-2015", name: "Söğütözü Plaza Kafeterya", type: "Kafe", district: "Söğütözü", contact: "Melis Ün", phone: "0312 219 05 77", driverId: "d2", stopNo: 5 },

  { id: "c11", code: "MI-3021", name: "Etlik Gross Market", type: "Market", district: "Etlik", contact: "Osman Duran", phone: "0312 325 41 06", driverId: "d3", stopNo: 1 },
  { id: "c12", code: "MI-3022", name: "Kalaba Bakkaliye", type: "Bakkal", district: "Kalaba", contact: "Hatice Gül", phone: "0312 359 62 88", driverId: "d3", stopNo: 2 },
  { id: "c13", code: "MI-3023", name: "Aktepe Yemek Fabrikası", type: "Kurum", district: "Aktepe", contact: "Levent Bora", phone: "0312 380 77 12", driverId: "d3", stopNo: 3 },
  { id: "c14", code: "MI-3024", name: "Ovacık Pide & Lahmacun", type: "Restoran", district: "Ovacık", contact: "Recep Sönmez", phone: "0312 336 24 51", driverId: "d3", stopNo: 4 },
  { id: "c15", code: "MI-3025", name: "Sanatoryum Kafe", type: "Kafe", district: "Etlik", contact: "Buse Yıldız", phone: "0312 322 19 47", driverId: "d3", stopNo: 5 },

  { id: "c16", code: "MI-4031", name: "Sincan Halk Market", type: "Market", district: "Sincan", contact: "Kadir Aslan", phone: "0312 271 33 90", driverId: "d4", stopNo: 1 },
  { id: "c17", code: "MI-4032", name: "Fatih Bakkaliye", type: "Bakkal", district: "Sincan", contact: "Ayten Kurt", phone: "0312 276 18 25", driverId: "d4", stopNo: 2 },
  { id: "c18", code: "MI-4033", name: "Eryaman Catering Hizmetleri", type: "Kurum", district: "Eryaman", contact: "Tolga Sezer", phone: "0312 280 66 34", driverId: "d4", stopNo: 3 },
  { id: "c19", code: "MI-4034", name: "Elvankent Kebap Salonu", type: "Restoran", district: "Elvankent", contact: "Şükrü Balcı", phone: "0312 279 45 12", driverId: "d4", stopNo: 4 },
  { id: "c20", code: "MI-4035", name: "Etimesgut Bölge Hastanesi", type: "Kurum", district: "Etimesgut", contact: "Dyt. Gamze Ok", phone: "0312 244 80 00", driverId: "d4", stopNo: 5 },

  { id: "c21", code: "MI-5041", name: "Natoyolu Mini Market", type: "Market", district: "Mamak", contact: "Erhan Polat", phone: "0312 391 27 63", driverId: "d5", stopNo: 1 },
  { id: "c22", code: "MI-5042", name: "Akdere Bakkaliye", type: "Bakkal", district: "Akdere", contact: "Mehmet Cin", phone: "0312 364 90 18", driverId: "d5", stopNo: 2 },
  { id: "c23", code: "MI-5043", name: "Mamak Belediyesi Aşevi", type: "Kurum", district: "Mamak", contact: "Songül Ateş", phone: "0312 306 12 00", driverId: "d5", stopNo: 3 },
  { id: "c24", code: "MI-5044", name: "Gülveren Kahvaltı Evi", type: "Kafe", district: "Gülveren", contact: "Fadime Şen", phone: "0312 370 51 29", driverId: "d5", stopNo: 4 },
];

const l = (productId: string, qty: number): OrderLine => ({ productId, qty });

/** Bugün verilen siparişler (yarın dağıtılacak) — admin bunları düzenler */
export const dailyOrders: DailyOrder[] = [
  { customerId: "c01", status: "ordered", updatedAt: "07:42", lines: [l("p01", 180), l("p02", 40), l("p05", 60)] },
  { customerId: "c02", status: "ordered", updatedAt: "08:05", lines: [l("p01", 60), l("p04", 40)] },
  {
    customerId: "c03",
    status: "ordered",
    updatedAt: "06:58",
    lines: [l("p05", 400), l("p06", 150), l("p07", 100), l("p16", 40)],
    note: "Kahvaltı servisi erken başlıyor, teslimat 06:30 öncesi olmalı.",
  },
  { customerId: "c04", status: "ordered", updatedAt: "09:12", lines: [l("p11", 120), l("p13", 60)] },
  { customerId: "c05", status: "declined", updatedAt: "09:30", lines: [], note: "Yarın tadilat nedeniyle kapalıyız." },

  { customerId: "c06", status: "ordered", updatedAt: "07:20", lines: [l("p01", 220), l("p02", 60), l("p03", 35), l("p14", 30)] },
  { customerId: "c07", status: "pending", updatedAt: null, lines: [] },
  { customerId: "c08", status: "ordered", updatedAt: "08:44", lines: [l("p05", 320), l("p06", 180)] },
  { customerId: "c09", status: "ordered", updatedAt: "10:02", lines: [l("p12", 240), l("p11", 90)] },
  { customerId: "c10", status: "ordered", updatedAt: "08:15", lines: [l("p16", 35), l("p11", 50)] },

  { customerId: "c11", status: "ordered", updatedAt: "07:05", lines: [l("p01", 300), l("p04", 120), l("p02", 80)] },
  { customerId: "c12", status: "declined", updatedAt: "08:50", lines: [], note: "Bugünden devir stok fazlası var." },
  {
    customerId: "c13",
    status: "ordered",
    updatedAt: "06:40",
    lines: [l("p05", 600), l("p07", 200), l("p09", 90)],
    note: "Kasa iadesi: 12 boş kasa geri alınacak.",
  },
  { customerId: "c14", status: "ordered", updatedAt: "09:48", lines: [l("p13", 140), l("p14", 45)] },
  { customerId: "c15", status: "pending", updatedAt: null, lines: [] },

  { customerId: "c16", status: "ordered", updatedAt: "07:35", lines: [l("p01", 260), l("p02", 70), l("p04", 100), l("p15", 25)] },
  { customerId: "c17", status: "declined", updatedAt: "09:05", lines: [], note: "İşletme sahibi izinli, dükkân kapalı." },
  {
    customerId: "c18",
    status: "ordered",
    updatedAt: "06:30",
    lines: [l("p05", 480), l("p06", 220), l("p12", 300)],
    note: "Fabrika servisi — sabah 05:00 kapı teslim.",
  },
  { customerId: "c19", status: "ordered", updatedAt: "10:20", lines: [l("p13", 90), l("p12", 160)] },
  {
    customerId: "c20",
    status: "ordered",
    updatedAt: "07:58",
    lines: [l("p09", 260), l("p06", 140), l("p03", 60)],
    note: "Diyet mutfağı için tuzsuz ürünler ayrı kasada gönderilecek.",
  },

  { customerId: "c21", status: "ordered", updatedAt: "08:30", lines: [l("p01", 90), l("p04", 60)] },
  { customerId: "c22", status: "declined", updatedAt: "09:22", lines: [] },
  { customerId: "c23", status: "ordered", updatedAt: "07:12", lines: [l("p01", 420), l("p14", 80), l("p15", 40)] },
  { customerId: "c24", status: "pending", updatedAt: null, lines: [] },
];

/**
 * Dün verilen (bugün dağıtılacak) siparişler. Kesinleşmiş, salt-okunur kabul edilir.
 * dailyOrders'tan deterministik olarak türetilir: dün giriş yapmayanlar tamamlanmış,
 * adetler dünkü talebe göre biraz farklıdır.
 */
const fallbackLines: OrderLine[] = [l("p01", 120), l("p05", 90), l("p04", 40)];

export const deliveryOrders: DailyOrder[] = dailyOrders.map((order, index) => {
  if (order.status === "pending") {
    return {
      customerId: order.customerId,
      status: "ordered",
      updatedAt: "16:40",
      lines: fallbackLines.map((line) => ({ ...line })),
    };
  }
  if (order.status === "declined") {
    return { ...order, lines: [] };
  }
  const factor = 0.82 + (index % 5) * 0.06; // 0.82 .. 1.06 (deterministik)
  return {
    ...order,
    updatedAt: order.updatedAt,
    lines: order.lines.map((line) => ({
      ...line,
      qty: Math.max(10, Math.round((line.qty * factor) / 5) * 5),
    })),
  };
});

export const initialSync: SyncRecord = {
  at: "08 Eylül 2026 · 18:04",
  customerCount: 21,
  unitCount: 6480,
};

/** Sipariş sisteminin son açılma/kapanma zamanı */
export const initialSystemToggleAt = "09 Eylül 2026 · 05:30";
