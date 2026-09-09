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
  deliveryOrders as seedDeliveryOrders,
  nextOrders as seedNextOrders,
  drivers as seedDrivers,
  initialSync,
  initialSystemToggleAt,
  products as seedProducts,
  DEFAULT_MAX_QTY,
  DEFAULT_ORDER_RULE,
} from "@/data/mockData";
import type {
  ActivityItem,
  Customer,
  DailyOrder,
  Driver,
  OrderLine,
  OrderRule,
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
  /** Bugün dağıtılacak (dün verilen) siparişler — salt okunur */
  deliveryOrders: DailyOrder[];
  /** 1 sonraki gün (yarın verilen) siparişler */
  nextOrders: DailyOrder[];

  // ---- sistem durumu ----
  orderSystemOpen: boolean;
  systemToggledAt: string;
  lastSync: SyncRecord;
  syncing: boolean;
  hasUnsyncedChanges: boolean;
  activity: ActivityItem[];
  toasts: ToastMessage[];

  // ---- ayarlar ----
  orderRule: OrderRule;
  maxQtyLimit: number;
  autoCloseEnabled: boolean;
  /** Otomatik kapanış saati (HH:mm) */
  cutoffTime: string;

  // ---- aksiyonlar ----
  toggleOrderSystem: () => void;
  syncToErp: () => void;
  setLineQty: (customerId: string, productId: string, qty: number) => void;
  addLine: (customerId: string, productId: string) => void;
  removeLine: (customerId: string, productId: string) => void;
  setOrderStatus: (customerId: string, status: OrderStatus) => void;
  createOrder: (customerId: string, lines: OrderLine[]) => void;
  saveProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  dismissToast: (id: number) => void;
  setOrderRule: (rule: OrderRule) => void;
  setMaxQtyLimit: (value: number) => void;
  setAutoCloseEnabled: (value: boolean) => void;
  setCutoffTime: (value: string) => void;

  // ---- seçiciler ----
  getProduct: (productId: string) => Product | undefined;
  getOrder: (customerId: string) => DailyOrder | undefined;
  getCustomer: (customerId: string) => Customer | undefined;
  getDriver: (driverId: string) => Driver | undefined;
  /** Ürünün aktif kurala göre üst sınırı */
  getMaxQty: (productId: string) => number;
  orderTotals: (order: DailyOrder) => { units: number };
  productionTotals: ProductionTotal[];
  metrics: {
    total: number;
    ordered: number;
    declined: number;
    pending: number;
    units: number;
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
  const [orderRule, setOrderRuleState] = useState<OrderRule>(DEFAULT_ORDER_RULE);
  const [maxQtyLimit, setMaxQtyLimitState] = useState<number>(DEFAULT_MAX_QTY);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  const [cutoffTime, setCutoffTime] = useState("18:00");
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

  const logActivity = useCallback((text: string, tone: ActivityItem["tone"] = "neutral") => {
    const entry: ActivityItem = { id: nextId(), at: clockStamp(), text, tone };
    setActivity((current) => [entry, ...current].slice(0, 12));
  }, []);

  // -------------------------------------------------------------- seçiciler

  const getProduct = useCallback(
    (productId: string) => products.find((p) => p.id === productId),
    [products],
  );
  const getOrder = useCallback(
    (customerId: string) => orders.find((o) => o.customerId === customerId),
    [orders],
  );
  const getCustomer = useCallback((customerId: string) => seedCustomers.find((c) => c.id === customerId), []);
  const getDriver = useCallback((driverId: string) => seedDrivers.find((d) => d.id === driverId), []);

  /** Aktif kurala göre bir ürünün üst sınırı */
  const getMaxQty = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return 0;
      return orderRule === "average"
        ? product.avgOrder
        : Math.min(product.maxOrderLimit, maxQtyLimit);
    },
    [products, orderRule, maxQtyLimit],
  );

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
        ? "Müşteriler bugün için sipariş girişi yapabilir."
        : "Yeni sipariş girişi ve değişiklik kabul edilmiyor.",
    });
  }, [logActivity, orderSystemOpen, pushToast]);

  const setOrderRule = useCallback((rule: OrderRule) => {
    setOrderRuleState(rule);
    setHasUnsyncedChanges(true);
  }, []);

  const setMaxQtyLimit = useCallback((value: number) => {
    setMaxQtyLimitState(Math.max(0, value));
    setHasUnsyncedChanges(true);
  }, []);

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
      const limit = getMaxQty(productId);
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
    [getMaxQty, mutateOrder],
  );

  const addLine = useCallback(
    (customerId: string, productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const defaultQty = Math.min(product.avgOrder, getMaxQty(productId));
      mutateOrder(customerId, (order) => {
        if (order.lines.some((line) => line.productId === productId)) return order;
        return {
          ...order,
          status: "ordered",
          editedByAdmin: true,
          updatedAt: clockStamp(),
          lines: [...order.lines, { productId, qty: defaultQty }],
        };
      });
    },
    [getMaxQty, mutateOrder, products],
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

  const createOrder = useCallback(
    (customerId: string, lines: OrderLine[]) => {
      const cleaned = lines
        .filter((line) => line.qty > 0)
        .map((line) => ({ productId: line.productId, qty: Math.min(line.qty, getMaxQty(line.productId)) }));
      mutateOrder(customerId, (order) => ({
        ...order,
        status: "ordered",
        editedByAdmin: true,
        updatedAt: clockStamp(),
        note: order.note,
        lines: cleaned,
      }));
      const name = seedCustomers.find((c) => c.id === customerId)?.name ?? "Müşteri";
      logActivity(`${name} için admin sipariş girişi yaptı`, "success");
      pushToast({
        tone: "success",
        title: "Sipariş eklendi",
        description: `${name} · ${cleaned.reduce((s, l2) => s + l2.qty, 0)} adet`,
      });
    },
    [getMaxQty, logActivity, mutateOrder, pushToast],
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

  // ------------------------------------------------------------- türetilmiş

  const orderTotals = useCallback(
    (order: DailyOrder) => ({
      units: order.lines.reduce((acc, line) => acc + line.qty, 0),
    }),
    [],
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
        return { product, qty: entry?.qty ?? 0, customerCount: entry?.customers ?? 0 };
      })
      .filter((row) => row.qty > 0)
      .sort((a, b) => b.qty - a.qty);
  }, [orders, products]);

  const metrics = useMemo(() => {
    let ordered = 0;
    let declined = 0;
    let pending = 0;
    let units = 0;

    for (const order of orders) {
      if (order.status === "declined") {
        declined += 1;
        continue;
      }
      if (order.status === "pending") {
        pending += 1;
        continue;
      }
      ordered += 1;
      for (const line of order.lines) units += line.qty;
    }

    const total = orders.length;
    return {
      total,
      ordered,
      declined,
      pending,
      units,
      responseRate: total === 0 ? 0 : Math.round(((ordered + declined) / total) * 100),
    };
  }, [orders]);

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
      logActivity(`${activeOrders.length} sipariş üretim programına aktarıldı`, "success");
      pushToast({
        tone: "success",
        title: "Veriler sipariş programına aktarıldı",
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
    deliveryOrders: seedDeliveryOrders,
    nextOrders: seedNextOrders,
    orderSystemOpen,
    systemToggledAt,
    lastSync,
    syncing,
    hasUnsyncedChanges,
    activity,
    toasts,
    orderRule,
    maxQtyLimit,
    autoCloseEnabled,
    cutoffTime,
    toggleOrderSystem,
    syncToErp,
    setLineQty,
    addLine,
    removeLine,
    setOrderStatus,
    createOrder,
    saveProduct,
    deleteProduct,
    dismissToast,
    setOrderRule,
    setMaxQtyLimit,
    setAutoCloseEnabled,
    setCutoffTime,
    getProduct,
    getOrder,
    getCustomer,
    getDriver,
    getMaxQty,
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
