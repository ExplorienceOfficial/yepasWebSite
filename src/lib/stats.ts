import type { Customer, DailyOrder, Driver, Product } from "@/types";

export interface DriverStat {
  driver: Driver;
  customers: Customer[];
  ordered: number;
  declined: number;
  pending: number;
  units: number;
  amount: number;
  /** Yaklaşık kasa sayısı — 1 kasa ≈ 40 birim */
  crates: number;
}

export const UNITS_PER_CRATE = 40;

export function computeDriverStats(
  drivers: Driver[],
  customers: Customer[],
  orders: DailyOrder[],
  products: Product[],
): DriverStat[] {
  const priceOf = (productId: string) =>
    products.find((product) => product.id === productId)?.unitPrice ?? 0;

  return drivers.map((driver) => {
    const own = customers
      .filter((customer) => customer.driverId === driver.id)
      .sort((a, b) => a.stopNo - b.stopNo);

    let ordered = 0;
    let declined = 0;
    let pending = 0;
    let units = 0;
    let amount = 0;

    for (const customer of own) {
      const order = orders.find((item) => item.customerId === customer.id);
      if (!order) continue;
      if (order.status === "ordered") ordered += 1;
      else if (order.status === "declined") declined += 1;
      else pending += 1;

      for (const line of order.lines) {
        units += line.qty;
        amount += line.qty * priceOf(line.productId);
      }
    }

    return {
      driver,
      customers: own,
      ordered,
      declined,
      pending,
      units,
      amount,
      crates: Math.ceil(units / UNITS_PER_CRATE),
    };
  });
}
