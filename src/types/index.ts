export type OrderStatus = "ordered" | "declined" | "pending";

export interface ProductCategory {
  id: string;
  name: string;
  /** Üretim hattı / fırın grubu bilgisi */
  line: string;
}

export interface Product {
  id: string;
  categoryId: string;
  /** Alt varyasyon adı: "3 Çizgili Üstü", "Kepekli" ... */
  name: string;
  code: string;
  /** Bir müşterinin tek seferde geçebileceği maksimum adet */
  maxOrderLimit: number;
  /** Geçmiş ortalama sipariş adedi — "Geçmiş Ortalama" kuralında üst sınır olarak kullanılır */
  avgOrder: number;
  imageUrl: string;
}

export interface Driver {
  id: string;
  code: string;
  name: string;
  phone: string;
  plate: string;
  region: string;
  /** Şoför portalına giriş için 4 haneli PIN (demo amaçlı) */
  pin: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: "Market" | "Bakkal" | "Restoran" | "Kafe" | "Otel" | "Kurum";
  district: string;
  contact: string;
  phone: string;
  driverId: string;
  /** Teslimat sırası (rota içindeki durak no) */
  stopNo: number;
}

export interface OrderLine {
  productId: string;
  qty: number;
}

export interface DailyOrder {
  customerId: string;
  status: OrderStatus;
  lines: OrderLine[];
  /** Müşterinin son giriş / güncelleme saati (HH:mm) — pending ise null */
  updatedAt: string | null;
  note?: string;
  /** Admin tarafından elle düzenlendi mi */
  editedByAdmin?: boolean;
}

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
}

export interface SyncRecord {
  at: string;
  customerCount: number;
  unitCount: number;
}

export interface ActivityItem {
  id: number;
  at: string;
  text: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

/** Maksimum sipariş adedi kuralı: sabit limit mi yoksa geçmiş ortalama mı? */
export type OrderRule = "limit" | "average";

/** Siparişler ekranındaki üç günlük görünüm */
export type OrderDay = "delivery" | "today" | "next";
