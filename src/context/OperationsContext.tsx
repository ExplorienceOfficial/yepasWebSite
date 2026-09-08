"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  categories as seedCategories,
  customers as seedCustomers,
  dailyOrders as seedOrders,
  drivers as seedDrivers,
  initialSync,
  initialSystemToggleAt,
  products as seedProducts,
} from "@/data/mockData";
import type {
  ActivityItem,
  Customer,
  DailyOrder,
  Driver,
  OrderStatus,
  Product,
  ProductCategory,
  SyncRecord,
  ToastMessage,
} from "@/types";

function nowStamp(): string {
  const now = new Date();
  const date = now.toLocaleDateString("tr-TR", { day: "2-digit", month: "long" });
  const time = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function clockStamp(): string {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export interface ProductionTotal {
  product: Product;
  qty: number;
  customerCount: number;
}

interface OperationsContextValue {
  // ---- veri ----
  categories: ProductCategory[];
  products: Product[];
  customers: Customer[];
  drivers: Driver[];
  orders: DailyOrder[];

  // ---- sistem durumu ----
  orderSystemOpen: boolean;
  systemToggledAt: string;
  lastSync: SyncRecord;
  syncing: boolean;
  hasUnsyncedChanges: boolean;
  activity: ActivityItem[];
  toasts: ToastMessage[];
  /** customerId -> teslim saati (HH:mm). Şoför portalından işaretlenir. */
  deliveries: Record<string, string>;

  // ---- aksiyonlar ----
  toggleOrderSystem: () => void;
  syncToErp: () => void;
  setLineQty: (customerId: string, productId: string, qty: number) => void;
  addLine: (customerId: string, productId: string) => void;
  removeLine: (customerId: string, productId: string) => void;
  setOrderStatus: (customerId: string, status: OrderStatus) => void;
  saveProduct: (product: Product) => void;
  toggleProductActive: (productId: string) => void;
  deleteProduct: (productId: string) => void;
  dismissToast: (id: number) => void;
  toggleDelivery: (customerId: string) => void;

  // ---- seçiciler ----
  getProduct: (productId: string) => Product | undefined;
  getOrder: (customerId: string) => DailyOrder | undefined;
  getCustomer: (customerId: string) => Customer | undefined;
  getDriver: (driverId: string) => Driver | undefined;
  orderTotals: (order: DailyOrder) => { units: number; amount: number };
  productionTotals: ProductionTotal[];
  metrics: {
    total: number;
    ordered: number;
    declined: number;
    pending: number;
    units: number;
    amount: number;
    responseRate: number;
  };
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<DailyOrder[]>(seedOrders);
  const [orderSystemOpen, setOrderSystemOpen] = useState(true);
  const [systemToggledAt, setSystemToggledAt] = useState(initialSystemToggleAt);
  const [lastSync, setLastSync] = useState<SyncRecord>(initialSync);
  const [syncing, setSyncing] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: 3, at: "10:20", text: "Elvankent Kebap Salonu siparişini güncelledi", tone: "neutral" },
    { id: 2, at: "09:30", text: "Kuğulu Kafe yarın için ürün istemedi", tone: "danger" },
    { id: 1, at: "06:30", text: "Eryaman Catering sabah siparişini geçti", tone: "success" },
  ]);

  const seq = useRef(100);
  const nextId = () => ++seq.current;

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = nextId();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  /** Şoför portalında bir durağı teslim edildi / edilmedi olarak işaretler. */
  const toggleDelivery = useCallback((customerId: string) => {
    const stamp = clockStamp();
    setDeliveries((current) => {
      const next = { ...current };
      if (next[customerId]) delete next[customerId];
      else next[customerId] = stamp;
      return next;
    });
  }, []);

  const logActivity = useCallback((text: string, tone: ActivityItem["tone"] = "neutral") => {
    const entry: ActivityItem = { id: nextId(), at: clockStamp(), text, tone };
    setActivity((current) => [entry, ...current].slice(0, 12));
  }, []);

  // ---------------------------------------------------------------- sistem

  const toggleOrderSystem = useCallback(() => {
    const next = !orderSystemOpen;
    setOrderSystemOpen(next);
    setSystemToggledAt(nowStamp());
    logActivity(
      next ? "Müşteri sipariş sistemi açıldı" : "Müşteri sipariş sistemi kapatıldı",
      next ? "success" : "warning",
    );
    pushToast({
      tone: next ? "success" : "info",
      title: next ? "Sipariş sistemi açıldı" : "Sipariş sistemi kapatıldı",
      description: next
        ? "Müşteriler yarın için sipariş girişi yapabilir."
        : "Yeni sipariş girişi ve değişiklik kabul edilmiyor.",
    });
  }, [logActivity, orderSystemOpen, pushToast]);

  // ------------------------------------------------------------- siparişler

  const mutateOrder = useCallback(
    (customerId: string, mutate: (order: DailyOrder) => DailyOrder) => {
      setOrders((current) =>
        current.map((order) => (order.customerId === customerId ? mutate(order) : order)),
      );
      setHasUnsyncedChanges(true);
    },
    [],
  );

  const setLineQty = useCallback(
    (customerId: string, productId: string, qty: number) => {
      const limit = products.find((p) => p.id === productId)?.maxOrderLimit ?? 9999;
      const safeQty = Math.max(0, Math.min(qty, limit));
      mutateOrder(customerId, (order) => ({
        ...order,
        status: "ordered",
        editedByAdmin: true,
        updatedAt: clockStamp(),
        lines: order.lines.map((line) =>
          line.productId === productId ? { ...line, qty: safeQty } : line,
        ),
      }));
    },
    [mutateOrder, products],
  );

  const addLine = useCallback(
    (customerId: string, productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      mutateOrder(customerId, (order) => {
        if (order.lines.some((line) => line.productId === productId)) return order;
        return {
          ...order,
          status: "ordered",
          editedByAdmin: true,
          updatedAt: clockStamp(),
          lines: [...order.lines, { productId, qty: product.avgOrder }],
        };
      });
    },
    [mutateOrder, products],
  );

  const removeLine = useCallback(
    (customerId: string, productId: string) => {
      mutateOrder(customerId, (order) => ({
        ...order,
        editedByAdmin: true,
        updatedAt: clockStamp(),
        lines: order.lines.filter((line) => line.productId !== productId),
      }));
    },
    [mutateOrder],
  );

  const setOrderStatus = useCallback(
    (customerId: string, status: OrderStatus) => {
      mutateOrder(customerId, (order) => ({
        ...order,
        status,
        editedByAdmin: true,
        updatedAt: status === "pending" ? null : clockStamp(),
        lines: status === "declined" ? [] : order.lines,
      }));
      const name = seedCustomers.find((c) => c.id === customerId)?.name ?? "Müşteri";
      if (status === "declined") {
        logActivity(`${name} siparişi admin tarafından iptal edildi`, "danger");
      } else if (status === "ordered") {
        logActivity(`${name} siparişi admin tarafından aktif edildi`, "success");
      }
    },
    [logActivity, mutateOrder],
  );

  // ----------------------------------------------------------------- ürün

  const saveProduct = useCallback(
    (product: Product) => {
      setProducts((current) => {
        const exists = current.some((p) => p.id === product.id);
        return exists
          ? current.map((p) => (p.id === product.id ? product : p))
          : [...current, product];
      });
      setHasUnsyncedChanges(true);
      pushToast({ tone: "success", title: "Ürün kaydedildi", description: product.name });
      logActivity(`${product.name} ürün kartı güncellendi`);
    },
    [logActivity, pushToast],
  );

  const toggleProductActive = useCallback((productId: string) => {
    setProducts((current) =>
      current.map((p) => (p.id === productId ? { ...p, active: !p.active } : p)),
    );
    setHasUnsyncedChanges(true);
  }, []);

  const deleteProduct = useCallback(
    (productId: string) => {
      const name = products.find((p) => p.id === productId)?.name ?? "Ürün";
      setProducts((current) => current.filter((p) => p.id !== productId));
      setOrders((current) =>
        current.map((order) => ({
          ...order,
          lines: order.lines.filter((line) => line.productId !== productId),
        })),
      );
      setHasUnsyncedChanges(true);
      pushToast({ tone: "info", title: "Ürün katalogdan kaldırıldı", description: name });
      logActivity(`${name} katalogdan kaldırıldı`, "warning");
    },
    [logActivity, products, pushToast],
  );

  // --------------------------------------------------------------- seçici

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );
  const getOrder = useCallback(
    (customerId: string) => orders.find((o) => o.customerId === customerId),
    [orders],
  );
  const getCustomer = useCallback(
    (customerId: string) => seedCustomers.find((c) => c.id === customerId),
    [],
  );
  const getDriver = useCallback((driverId: string) => seedDrivers.find((d) => d.id === driverId), []);

  const orderTotals = useCallback(
    (order: DailyOrder) =>
      order.lines.reduce(
        (acc, line) => {
          const product = products.find((p) => p.id === line.productId);
          acc.units += line.qty;
          acc.amount += line.qty * (product?.unitPrice ?? 0);
          return acc;
        },
        { units: 0, amount: 0 },
      ),
    [products],
  );

  const productionTotals = useMemo<ProductionTotal[]>(() => {
    const bucket = new Map<string, { qty: number; customers: number }>();
    for (const order of orders) {
      if (order.status !== "ordered") continue;
      for (const line of order.lines) {
        if (line.qty <= 0) continue;
        const entry = bucket.get(line.productId) ?? { qty: 0, customers: 0 };
        entry.qty += line.qty;
        entry.customers += 1;
        bucket.set(line.productId, entry);
      }
    }
    return products
      .map((product) => {
        const entry = bucket.get(product.id);
        return {
          product,
          qty: entry?.qty ?? 0,
          customerCount: entry?.customers ?? 0,
        };
      })
      .filter((row) => row.qty > 0)
      .sort((a, b) => b.qty - a.qty);
  }, [orders, products]);

  const metrics = useMemo(() => {
    let ordered = 0;
    let declined = 0;
    let pending = 0;
    let units = 0;
    let amount = 0;

    for (const order of orders) {
      if (order.status === "declined") {
        declined += 1;
        continue;
      }
      if (order.status === "pending") {
        pending += 1;
        continue;
      }

      // Yalnızca onaylı siparişler üretim emrine ve ciroya dahil edilir.
      ordered += 1;
      for (const line of order.lines) {
        const product = products.find((p) => p.id === line.productId);
        units += line.qty;
        amount += line.qty * (product?.unitPrice ?? 0);
      }
    }

    const total = orders.length;
    return {
      total,
      ordered,
      declined,
      pending,
      units,
      amount,
      responseRate: total === 0 ? 0 : Math.round(((ordered + declined) / total) * 100),
    };
  }, [orders, products]);

  const syncToErp = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    window.setTimeout(() => {
      const activeOrders = orders.filter((o) => o.status === "ordered");
      const units = activeOrders.reduce(
        (sum, order) => sum + order.lines.reduce((s, line) => s + line.qty, 0),
        0,
      );
      setLastSync({ at: nowStamp(), customerCount: activeOrders.length, unitCount: units });
      setHasUnsyncedChanges(false);
      setSyncing(false);
      logActivity(`${activeOrders.length} sipariş ERP sistemine aktarıldı`, "success");
      pushToast({
        tone: "success",
        title: "Siparişler başarıyla aktarıldı",
        description: `${activeOrders.length} müşteri · ${units.toLocaleString("tr-TR")} adet üretim emri oluşturuldu.`,
      });
    }, 1600);
  }, [logActivity, orders, pushToast, syncing]);

  const value: OperationsContextValue = {
    categories: seedCategories,
    products,
    customers: seedCustomers,
    drivers: seedDrivers,
    orders,
    orderSystemOpen,
    systemToggledAt,
    lastSync,
    syncing,
    hasUnsyncedChanges,
    activity,
    toasts,
    deliveries,
    toggleOrderSystem,
    syncToErp,
    setLineQty,
    addLine,
    removeLine,
    setOrderStatus,
    saveProduct,
    toggleProductActive,
    deleteProduct,
    dismissToast,
    toggleDelivery,
    getProduct,
    getOrder,
    getCustomer,
    getDriver,
    orderTotals,
    productionTotals,
    metrics,
  };

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations(): OperationsContextValue {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error("useOperations, OperationsProvider içinde kullanılmalıdır.");
  return ctx;
}
