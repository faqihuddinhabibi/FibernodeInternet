import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { invoices, customers, packages, users, activityLogs } from '../../db/schema.js';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../middleware/errorHandler.js';
import { generateInvoicesForDate } from './invoice-generator.js';
import type { PayInvoiceInput, UnpayInvoiceInput } from './invoices.schema.js';
import { addDays } from 'date-fns';

export class InvoicesService {
  async list(userId: string, role: string, period?: string, status?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (role === 'mitra') {
      conditions.push(eq(invoices.ownerId, userId));
    }

    if (period) {
      conditions.push(eq(invoices.period, period));
    }

    if (status) {
      conditions.push(eq(invoices.status, status as 'unpaid' | 'paid' | 'partial'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(whereClause);

    const data = await db
      .select({
        id: invoices.id,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        ownerId: invoices.ownerId,
        ownerName: users.name,
        ownerBusinessName: users.businessName,
        packageName: packages.name,
        packageSpeed: packages.speed,
        period: invoices.period,
        amount: invoices.amount,
        discount: invoices.discount,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
        paymentNote: invoices.paymentNote,
        dueDate: invoices.dueDate,
        receiptToken: invoices.receiptToken,
        version: invoices.version,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(whereClause)
      .orderBy(desc(invoices.dueDate))
      .limit(limit)
      .offset(offset);

    return {
      data,
      meta: {
        total: countResult.count,
        page,
        limit,
        totalPages: Math.ceil(countResult.count / limit),
      },
    };
  }

  async getById(id: string, userId: string, role: string) {
    const [invoice] = await db
      .select({
        id: invoices.id,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerNik: customers.nik,
        ownerId: invoices.ownerId,
        ownerName: users.name,
        ownerBusinessName: users.businessName,
        ownerBankName: users.bankName,
        ownerBankAccount: users.bankAccount,
        ownerBankHolder: users.bankHolder,
        packageName: packages.name,
        packageSpeed: packages.speed,
        period: invoices.period,
        amount: invoices.amount,
        discount: invoices.discount,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
        paymentNote: invoices.paymentNote,
        dueDate: invoices.dueDate,
        receiptToken: invoices.receiptToken,
        receiptUrl: invoices.receiptUrl,
        reminderSentAt: invoices.reminderSentAt,
        receiptSentAt: invoices.receiptSentAt,
        version: invoices.version,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) throw new NotFoundError('Tagihan tidak ditemukan');

    if (role === 'mitra' && invoice.ownerId !== userId) {
      throw new ForbiddenError('Anda tidak memiliki akses ke tagihan ini');
    }

    return invoice;
  }

  async markAsPaid(id: string, data: PayInvoiceInput, userId: string, role: string, ipAddress: string) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw new NotFoundError('Tagihan tidak ditemukan');

    if (role === 'mitra' && invoice.ownerId !== userId) {
      throw new ForbiddenError('Anda tidak memiliki akses ke tagihan ini');
    }

    // Optimistic locking
    const [updated] = await db.update(invoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        paidBy: userId,
        paymentMethod: data.paymentMethod || 'cash',
        paymentNote: data.paymentNote,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.version, data.version)))
      .returning();

    if (!updated) {
      throw new ConflictError('Data sudah diubah oleh user lain. Silakan refresh.');
    }

    await db.insert(activityLogs).values({
      userId,
      action: 'invoices.pay',
      resource: 'invoices',
      resourceId: id,
      metadata: { paymentMethod: data.paymentMethod },
      ipAddress,
    });

    return updated;
  }

  async markAsUnpaid(id: string, data: UnpayInvoiceInput, userId: string, role: string, ipAddress: string) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw new NotFoundError('Tagihan tidak ditemukan');

    if (role === 'mitra' && invoice.ownerId !== userId) {
      throw new ForbiddenError('Anda tidak memiliki akses ke tagihan ini');
    }

    const [updated] = await db.update(invoices)
      .set({
        status: 'unpaid',
        paidAt: null,
        paidBy: null,
        paymentMethod: null,
        paymentNote: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.version, data.version)))
      .returning();

    if (!updated) {
      throw new ConflictError('Data sudah diubah oleh user lain. Silakan refresh.');
    }

    await db.insert(activityLogs).values({
      userId,
      action: 'invoices.unpay',
      resource: 'invoices',
      resourceId: id,
      ipAddress,
    });

    return updated;
  }

  async generate(ownerId: string | undefined, userId: string, ipAddress: string) {
    const tomorrow = addDays(new Date(), 1).getDate();
    const result = await generateInvoicesForDate(tomorrow, ownerId);

    await db.insert(activityLogs).values({
      userId,
      action: 'invoices.generate',
      resource: 'invoices',
      metadata: { ...result, ownerId },
      ipAddress,
    });

    return result;
  }

  async getByReceiptToken(token: string) {
    const [invoice] = await db
      .select({
        id: invoices.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerNik: customers.nik,
        ownerBusinessName: users.businessName,
        ownerBankName: users.bankName,
        ownerBankAccount: users.bankAccount,
        ownerBankHolder: users.bankHolder,
        packageName: packages.name,
        packageSpeed: packages.speed,
        period: invoices.period,
        amount: invoices.amount,
        discount: invoices.discount,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(eq(invoices.receiptToken, token))
      .limit(1);

    if (!invoice) throw new NotFoundError('Nota tidak ditemukan');
    return invoice;
  }
}

export const invoicesService = new InvoicesService();
