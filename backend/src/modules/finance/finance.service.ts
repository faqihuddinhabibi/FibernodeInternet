import { eq, and, sql, gte, lte, between } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { invoices, customers, users, packages } from '../../db/schema.js';

export class FinanceService {
  async getSummary(userId: string, role: string, period?: string) {
    const conditions = [];
    if (role === 'mitra') {
      conditions.push(eq(invoices.ownerId, userId));
    }
    if (period) {
      conditions.push(eq(invoices.period, period));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [summary] = await db
      .select({
        totalInvoices: sql<number>`count(*)::int`,
        totalAmount: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)::int`,
        totalPaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        totalUnpaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'unpaid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        paidCount: sql<number>`count(case when ${invoices.status} = 'paid' then 1 end)::int`,
        unpaidCount: sql<number>`count(case when ${invoices.status} = 'unpaid' then 1 end)::int`,
      })
      .from(invoices)
      .where(whereClause);

    const [customerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(
        role === 'mitra'
          ? and(eq(customers.ownerId, userId), eq(customers.status, 'active'))
          : eq(customers.status, 'active')
      );

    return {
      ...summary,
      activeCustomers: customerCount.count,
      percentage: summary.totalAmount > 0
        ? Math.round((summary.totalPaid / summary.totalAmount) * 100)
        : 0,
    };
  }

  async getByPeriod(userId: string, role: string, year: number) {
    const conditions = [];
    if (role === 'mitra') {
      conditions.push(eq(invoices.ownerId, userId));
    }
    conditions.push(sql`${invoices.period} like ${`${year}-%`}`);

    const data = await db
      .select({
        period: invoices.period,
        totalAmount: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)::int`,
        totalPaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        totalUnpaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'unpaid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        invoiceCount: sql<number>`count(*)::int`,
        paidCount: sql<number>`count(case when ${invoices.status} = 'paid' then 1 end)::int`,
      })
      .from(invoices)
      .where(and(...conditions))
      .groupBy(invoices.period)
      .orderBy(invoices.period);

    return data;
  }

  async getByDate(userId: string, role: string, date: string) {
    const conditions = [eq(invoices.dueDate, date)];
    if (role === 'mitra') {
      conditions.push(eq(invoices.ownerId, userId));
    }

    const data = await db
      .select({
        id: invoices.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        ownerBusinessName: users.businessName,
        packageName: packages.name,
        period: invoices.period,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(and(...conditions))
      .orderBy(customers.name);

    return data;
  }

  async getByMitra(year?: number) {
    const conditions = [];
    if (year) {
      conditions.push(sql`${invoices.period} like ${`${year}-%`}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select({
        ownerId: invoices.ownerId,
        ownerName: users.name,
        ownerBusinessName: users.businessName,
        totalAmount: sql<number>`coalesce(sum(${invoices.totalAmount}), 0)::int`,
        totalPaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        totalUnpaid: sql<number>`coalesce(sum(case when ${invoices.status} = 'unpaid' then ${invoices.totalAmount} else 0 end), 0)::int`,
        invoiceCount: sql<number>`count(*)::int`,
        paidCount: sql<number>`count(case when ${invoices.status} = 'paid' then 1 end)::int`,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.ownerId, users.id))
      .where(whereClause)
      .groupBy(invoices.ownerId, users.name, users.businessName)
      .orderBy(users.businessName);

    return data;
  }
}

export const financeService = new FinanceService();
