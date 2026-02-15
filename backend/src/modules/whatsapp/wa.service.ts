import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { waSessions, waMessageLogs, waMessageQueue, customers, invoices, users, packages } from '../../db/schema.js';
import { createSession, disconnectSession, getSession, sendMessage, isOnWhatsApp } from '../../lib/wa-manager.js';
import { buildReminderMessage, buildReceiptMessage, buildIsolationMessage } from './wa.templates.js';
import { addToQueue, getQueueStatus } from './wa.queue.js';
import { NotFoundError, AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

export class WaService {
  async getStatus(userId: string) {
    const [session] = await db.select().from(waSessions).where(eq(waSessions.userId, userId)).limit(1);
    return session || { status: 'disconnected', phoneNumber: null };
  }

  async connect(userId: string) {
    await createSession(userId);
    return { message: 'Koneksi WA dimulai. Scan QR code.' };
  }

  async disconnect(userId: string) {
    await disconnectSession(userId);
    return { message: 'WA terputus' };
  }

  async sendTest(userId: string, phone: string, message: string) {
    const session = getSession(userId);
    if (!session) throw new AppError(400, 'Hubungkan WhatsApp terlebih dahulu');

    const success = await sendMessage(userId, phone, message);
    if (!success) throw new AppError(500, 'Gagal mengirim pesan');

    await db.insert(waMessageLogs).values({
      customerId: null,
      invoiceId: null,
      messageType: 'custom',
      phone,
      content: message,
      status: 'sent',
    });

    return { message: 'Pesan terkirim' };
  }

  async sendManual(userId: string, role: string, customerId: string, template: string, customMessage?: string, invoiceId?: string) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) throw new NotFoundError('Pelanggan tidak ditemukan');

    if (role === 'mitra' && customer.ownerId !== userId) {
      throw new AppError(403, 'Anda tidak memiliki akses ke pelanggan ini');
    }

    const ownerId = customer.ownerId;
    const sock = getSession(ownerId);
    if (!sock) throw new AppError(400, 'Hubungkan WhatsApp terlebih dahulu');

    const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
    const [pkg] = await db.select().from(packages).where(eq(packages.id, customer.packageId)).limit(1);

    let content = customMessage || '';

    if (template === 'reminder' && pkg && owner) {
      content = buildReminderMessage({
        customerName: customer.name,
        nextMonth: 'Bulan Depan',
        year: new Date().getFullYear(),
        packageName: pkg.name,
        speed: pkg.speed,
        totalBill: customer.totalBill,
        billingDate: customer.billingDate,
        bankName: owner.bankName,
        bankAccount: owner.bankAccount,
        bankHolder: owner.bankHolder,
        businessName: owner.businessName,
      });
    } else if (template === 'isolation' && owner) {
      content = buildIsolationMessage({
        customerName: customer.name,
        bankName: owner.bankName,
        bankAccount: owner.bankAccount,
        bankHolder: owner.bankHolder,
        businessName: owner.businessName,
      });
    }

    if (!content) throw new AppError(400, 'Pesan tidak boleh kosong');

    const success = await sendMessage(ownerId, customer.phone, content);

    const [session] = await db.select().from(waSessions).where(eq(waSessions.userId, ownerId)).limit(1);

    await db.insert(waMessageLogs).values({
      sessionId: session?.id,
      customerId: customer.id,
      invoiceId: invoiceId || null,
      messageType: template === 'custom' ? 'manual' : template,
      phone: customer.phone,
      content,
      status: success ? 'sent' : 'failed',
      errorMessage: success ? null : 'Gagal mengirim pesan',
    });

    if (!success) throw new AppError(500, 'Gagal mengirim pesan');
    return { message: 'Pesan terkirim' };
  }

  async sendBulk(userId: string, role: string, customerIds: string[], template: string, customMessage?: string) {
    const [session] = await db.select().from(waSessions).where(eq(waSessions.userId, userId)).limit(1);
    if (!session || session.status !== 'connected') {
      throw new AppError(400, 'Hubungkan WhatsApp terlebih dahulu');
    }

    const [owner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!owner) throw new NotFoundError('User tidak ditemukan');

    let scheduledTime = new Date();
    let queued = 0;

    for (const customerId of customerIds) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (!customer) continue;
      if (role === 'mitra' && customer.ownerId !== userId) continue;

      let content = customMessage || '';
      if (template === 'reminder') {
        const [pkg] = await db.select().from(packages).where(eq(packages.id, customer.packageId)).limit(1);
        if (pkg) {
          content = buildReminderMessage({
            customerName: customer.name,
            nextMonth: 'Bulan Depan',
            year: new Date().getFullYear(),
            packageName: pkg.name,
            speed: pkg.speed,
            totalBill: customer.totalBill,
            billingDate: customer.billingDate,
            bankName: owner.bankName,
            bankAccount: owner.bankAccount,
            bankHolder: owner.bankHolder,
            businessName: owner.businessName,
          });
        }
      }

      if (!content) continue;

      const delay = Math.floor(Math.random() * 12000) + 8000;
      scheduledTime = new Date(scheduledTime.getTime() + delay);

      await addToQueue({
        sessionId: session.id,
        customerId: customer.id,
        phone: customer.phone,
        content,
        messageType: template === 'custom' ? 'manual' : template,
        scheduledAt: scheduledTime,
      });
      queued++;
    }

    return { message: `${queued} pesan dijadwalkan`, queued };
  }

  async checkNumber(userId: string, phone: string) {
    const exists = await isOnWhatsApp(userId, phone);
    return { phone, registered: exists };
  }

  async getLogs(userId: string, role: string, type?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (role === 'mitra') {
      const [session] = await db.select().from(waSessions).where(eq(waSessions.userId, userId)).limit(1);
      if (session) {
        conditions.push(eq(waMessageLogs.sessionId, session.id));
      }
    }

    if (type) {
      conditions.push(eq(waMessageLogs.messageType, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(waMessageLogs)
      .where(whereClause);

    const data = await db
      .select()
      .from(waMessageLogs)
      .where(whereClause)
      .orderBy(desc(waMessageLogs.sentAt))
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

  async getQueue(userId: string) {
    const [session] = await db.select().from(waSessions).where(eq(waSessions.userId, userId)).limit(1);
    const stats = await getQueueStatus(session?.id);
    return stats;
  }

  async retryQueueMessage(id: string) {
    const [msg] = await db.select().from(waMessageQueue).where(eq(waMessageQueue.id, id)).limit(1);
    if (!msg) throw new NotFoundError('Pesan tidak ditemukan');

    await db.update(waMessageQueue)
      .set({ status: 'pending', scheduledAt: new Date(), retryCount: 0, updatedAt: new Date() })
      .where(eq(waMessageQueue.id, id));

    return { message: 'Pesan dijadwalkan ulang' };
  }

  async cancelQueueMessage(id: string) {
    const [msg] = await db.select().from(waMessageQueue).where(eq(waMessageQueue.id, id)).limit(1);
    if (!msg) throw new NotFoundError('Pesan tidak ditemukan');
    if (msg.status !== 'pending') throw new AppError(400, 'Hanya pesan pending yang bisa dibatalkan');

    await db.delete(waMessageQueue).where(eq(waMessageQueue.id, id));
    return { message: 'Pesan dibatalkan' };
  }
}

export const waService = new WaService();
