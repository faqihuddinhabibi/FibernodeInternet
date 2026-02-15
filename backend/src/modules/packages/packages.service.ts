import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { packages, customers, activityLogs } from '../../db/schema.js';
import { AppError, NotFoundError } from '../../middleware/errorHandler.js';
import type { CreatePackageInput, UpdatePackageInput } from './packages.schema.js';

export class PackagesService {
  async list(activeOnly: boolean = false) {
    if (activeOnly) {
      return db.select().from(packages).where(eq(packages.isActive, true)).orderBy(packages.price);
    }
    return db.select().from(packages).orderBy(packages.price);
  }

  async getById(id: string) {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (!pkg) throw new NotFoundError('Paket tidak ditemukan');
    return pkg;
  }

  async create(data: CreatePackageInput, adminId: string, ipAddress: string) {
    const [pkg] = await db.insert(packages).values(data).returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'packages.create',
      resource: 'packages',
      resourceId: pkg.id,
      metadata: { name: data.name },
      ipAddress,
    });

    return pkg;
  }

  async update(id: string, data: UpdatePackageInput, adminId: string, ipAddress: string) {
    const [existing] = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Paket tidak ditemukan');

    const [updated] = await db.update(packages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(packages.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'packages.update',
      resource: 'packages',
      resourceId: id,
      ipAddress,
    });

    return updated;
  }

  async softDelete(id: string, adminId: string, ipAddress: string) {
    const [existing] = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Paket tidak ditemukan');

    const [customerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.packageId, id));

    if (customerCount.count > 0) {
      throw new AppError(400, `Paket masih digunakan oleh ${customerCount.count} pelanggan. Tidak bisa dihapus.`);
    }

    const [updated] = await db.update(packages)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(packages.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'packages.delete',
      resource: 'packages',
      resourceId: id,
      ipAddress,
    });

    return updated;
  }
}

export const packagesService = new PackagesService();
