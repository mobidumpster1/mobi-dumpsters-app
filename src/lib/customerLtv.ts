// Lifetime, not period-scoped — unlike the Customers tab's top-spenders
// table (which respects the Reports date-range filter), LTV is deliberately
// computed off all-time data every time, since "value over a lifetime" as
// of last month isn't a meaningful question.
export type CustomerLtvRow = {
  customerId: string;
  name: string;
  companyName: string | null;
  lifetimeRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  firstOrderDate: Date | null;
  lastOrderDate: Date | null;
  customerSince: Date;
};

type CustomerLike = {
  id: string;
  name: string;
  companyName: string | null;
  createdAt: Date;
};

type InvoiceLike = {
  customerId: string | null;
  booking: { customerId: string } | null;
  amount: number;
  issueDate: Date;
};

export function computeCustomerLtv(
  customers: CustomerLike[],
  invoices: InvoiceLike[]
): CustomerLtvRow[] {
  const byCustomer = new Map<
    string,
    { revenue: number; count: number; first: Date; last: Date }
  >();

  for (const invoice of invoices) {
    const customerId = invoice.booking?.customerId ?? invoice.customerId;
    if (!customerId) continue;
    const entry = byCustomer.get(customerId);
    if (!entry) {
      byCustomer.set(customerId, {
        revenue: invoice.amount,
        count: 1,
        first: invoice.issueDate,
        last: invoice.issueDate,
      });
      continue;
    }
    entry.revenue += invoice.amount;
    entry.count += 1;
    if (invoice.issueDate < entry.first) entry.first = invoice.issueDate;
    if (invoice.issueDate > entry.last) entry.last = invoice.issueDate;
  }

  return customers
    .map((customer) => {
      const entry = byCustomer.get(customer.id);
      return {
        customerId: customer.id,
        name: customer.name,
        companyName: customer.companyName,
        lifetimeRevenue: entry?.revenue ?? 0,
        orderCount: entry?.count ?? 0,
        avgOrderValue: entry && entry.count > 0 ? entry.revenue / entry.count : 0,
        firstOrderDate: entry?.first ?? null,
        lastOrderDate: entry?.last ?? null,
        customerSince: customer.createdAt,
      };
    })
    .filter((row) => row.orderCount > 0)
    .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
}
