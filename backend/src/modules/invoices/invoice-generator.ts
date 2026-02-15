import { eq, and, ne } from 'drizzle-orm';
import { addMonths, format } from 'date-fns';
import { nanoid } from 'nanoid';
import { db } from '../../db/index.js';
import { customers, invoices, packages } from '../../db/schema.js';
import { logger } from '../../utils/logger.js';

export async function generateInvoicesForDate(billingDate: number, ownerId?: string) {
  const conditions = [
    eq(customers.billingDate, billingDate),
    ne(customers.status, 'isolated'),
  ];

  if (ownerId) {
    conditions.push(eq(customers.ownerId, ownerId));
  }

  const activeCustomers = await db
    .select({
      id: customers.id,
      ownerId: customers.ownerId,
      packageId: customers.packageId,
      billingDate: customers.billingDate,
      discount: customers.discount,
      totalBill: customers.totalBill,
      status: customers.status,
    })
    .from(customers)
    .where(and(...conditions));

  if (activeCustomers.length === 0) {
    logger.info({ billingDate, ownerId }, 'No customers found for invoice generation');
    return { generated: 0, skipped: 0 };
  }

  const allPackages = await db.select().from(packages);
  const pkgMap = new Map(allPackages.map((p) => [p.id, p]));

  // Next month period (pra-bayar)
  const now = new Date();
  const nextMonth = addMonths(now, 1);
  const period = format(nextMonth, 'yyyy-MM');

  let generated = 0;
  let skipped = 0;

  for (const customer of activeCustomers) {
    const pkg = pkgMap.get(customer.packageId);
    if (!pkg) {
      logger.warn({ customerId: customer.id }, 'Package not found for customer');
      skipped++;
      continue;
    }

    // Due date = billing date of current month
    const dueYear = now.getFullYear();
    const dueMonth = now.getMonth() + 1;
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(customer.billingDate).padStart(2, '0')}`;

    const receiptToken = nanoid(32);

    try {
      await db.insert(invoices).values({
        customerId: customer.id,
        ownerId: customer.ownerId,
        period,
        amount: pkg.price,
        discount: customer.discount,
        totalAmount: customer.totalBill,
        dueDate,
        receiptToken,
      }).onConflictDoNothing();
      generated++;
    } catch (error) {
      logger.warn({ customerId: customer.id, error }, 'Failed to generate invoice');
      skipped++;
    }
  }

  logger.info({ billingDate, generated, skipped }, 'Invoice generation completed');
  return { generated, skipped };
}
