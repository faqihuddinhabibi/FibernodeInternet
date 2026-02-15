import { eq, and, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { db } from '../../db/index.js';
import { customers, invoices, users } from '../../db/schema.js';

export class DashboardService {
  async getStats(userId: string, role: string) {
    const currentPeriod = format(new Date(), 'yyyy-MM');

    const customerConditions = role === 'mitra' ? eq(customers.ownerId, userId) : undefined;
    const invoiceConditions = [];
    if (role === 'mitra') {
      invoiceConditions.push(eq(invoices.ownerId, userId));
    }
    invoiceConditions.push(eq(invoices.period, currentPeriod));

    const [customerStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(case when ${customers.status} = 'active' then 1 end)::int`,
        isolated: sql<number>`count(case when ${customers.status} = 'isolated' then 1 end)::int`,
      })
      .from(customers)
      .where(customerConditions);

    const [invoiceStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        totalAmount: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)::int`,
        paid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        unpaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'unpaid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        paidCount: sql<number>`count(case when ${invoices.status} = 'paid' then 1 end)::int`,
        unpaidCount: sql<number>`count(case when ${invoices.status} = 'unpaid' then 1 end)::int`,
      })
      .from(invoices)
      .where(and(...invoiceConditions));

    // Revenue last 12 months
    const revenueData = await db
      .select({
        period: invoices.period,
        revenue: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.totalAmount} else 0 end), 0)::int`,
      })
      .from(invoices)
      .where(role === 'mitra' ? eq(invoices.ownerId, userId) : undefined)
      .groupBy(invoices.period)
      .orderBy(sql`${invoices.period} desc`)
      .limit(12);

    return {
      customers: customerStats,
      invoices: {
        ...invoiceStats,
        period: currentPeriod,
        percentage: invoiceStats.totalAmount > 0
          ? Math.round((invoiceStats.paid / invoiceStats.totalAmount) * 100)
          : 0,
      },
      revenueChart: revenueData.reverse(),
    };
  }
}

export const dashboardService = new DashboardService();
