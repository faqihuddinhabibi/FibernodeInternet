import cron from 'node-cron';
import { eq, and, ne } from 'drizzle-orm';
import { addDays, addMonths, format, addMilliseconds } from 'date-fns';
import { db } from '../../db/index.js';
import { customers, packages, users, waSessions, invoices } from '../../db/schema.js';
import { generateInvoicesForDate } from '../invoices/invoice-generator.js';
import { addToQueue } from './wa.queue.js';
import { processQueue } from './wa.queue.js';
import { buildReminderMessage } from './wa.templates.js';
import { logger } from '../../utils/logger.js';

const WA_RATE_CONFIG = {
  MIN_DELAY_MS: 8_000,
  MAX_DELAY_MS: 15_000,
  JITTER_MS: 5_000,
  BATCH_SIZE: 20,
  BATCH_COOLDOWN_MS: 300_000,
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function startScheduler() {
  // Daily at 06:00 WIB - Generate invoices and schedule reminders
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running daily invoice generation and reminder scheduling...');

    try {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowDate = tomorrow.getDate();

      // Generate invoices for customers with billing date = tomorrow
      await generateInvoicesForDate(tomorrowDate);

      // Get active customers with billing date = tomorrow
      const activeCustomers = await db
        .select({
          id: customers.id,
          ownerId: customers.ownerId,
          name: customers.name,
          phone: customers.phone,
          billingDate: customers.billingDate,
          discount: customers.discount,
          totalBill: customers.totalBill,
          packageId: customers.packageId,
          status: customers.status,
        })
        .from(customers)
        .where(
          and(
            eq(customers.billingDate, tomorrowDate),
            ne(customers.status, 'isolated')
          )
        );

      if (activeCustomers.length === 0) {
        logger.info('No customers to remind today');
        return;
      }

      // Group by owner
      const byOwner = new Map<string, typeof activeCustomers>();
      for (const c of activeCustomers) {
        const list = byOwner.get(c.ownerId) || [];
        list.push(c);
        byOwner.set(c.ownerId, list);
      }

      const allPackages = await db.select().from(packages);
      const pkgMap = new Map(allPackages.map((p) => [p.id, p]));

      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const allSessions = await db.select().from(waSessions);
      const sessionMap = new Map(allSessions.map((s) => [s.userId, s]));

      const nextMonth = addMonths(new Date(), 1);
      const nextMonthName = format(nextMonth, 'MMMM');
      const nextYear = nextMonth.getFullYear();

      for (const [ownerId, ownerCustomers] of byOwner) {
        const session = sessionMap.get(ownerId);
        if (!session || session.status !== 'connected') {
          logger.warn({ ownerId }, 'WA session not connected, skipping reminders');
          continue;
        }

        const owner = userMap.get(ownerId);
        if (!owner) continue;

        let scheduledTime = new Date();
        let batchCount = 0;

        for (const customer of ownerCustomers) {
          const pkg = pkgMap.get(customer.packageId);
          if (!pkg) continue;

          const content = buildReminderMessage({
            customerName: customer.name,
            nextMonth: nextMonthName,
            year: nextYear,
            packageName: pkg.name,
            speed: pkg.speed,
            totalBill: customer.totalBill,
            billingDate: customer.billingDate,
            bankName: owner.bankName,
            bankAccount: owner.bankAccount,
            bankHolder: owner.bankHolder,
            businessName: owner.businessName,
          });

          const delay = randomBetween(WA_RATE_CONFIG.MIN_DELAY_MS, WA_RATE_CONFIG.MAX_DELAY_MS)
            + randomBetween(0, WA_RATE_CONFIG.JITTER_MS);
          scheduledTime = addMilliseconds(scheduledTime, delay);
          batchCount++;

          if (batchCount >= WA_RATE_CONFIG.BATCH_SIZE) {
            scheduledTime = addMilliseconds(scheduledTime, WA_RATE_CONFIG.BATCH_COOLDOWN_MS);
            batchCount = 0;
          }

          await addToQueue({
            sessionId: session.id,
            customerId: customer.id,
            phone: customer.phone,
            content,
            messageType: 'reminder',
            scheduledAt: scheduledTime,
          });
        }

        logger.info({ ownerId, count: ownerCustomers.length }, 'Scheduled reminder messages');
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler error');
    }
  }, { timezone: 'Asia/Jakarta' });

  // Process queue every minute
  cron.schedule('* * * * *', async () => {
    await processQueue();
  }, { timezone: 'Asia/Jakarta' });

  logger.info('WA scheduler started');
}
