import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers, packages, users, invoices, activityLogs } from '../../db/schema.js';
import { AppError, NotFoundError, ForbiddenError } from '../../middleware/errorHandler.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.schema.js';

export class CustomersService {
  async list(userId: string, role: string, query?: string, status?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (role === 'mitra') {
      conditions.push(eq(customers.ownerId, userId));
    }

    if (status) {
      conditions.push(eq(customers.status, status as 'active' | 'isolated' | 'inactive'));
    }

    if (query) {
      conditions.push(
        or(
          ilike(customers.name, `%${query}%`),
          ilike(customers.phone, `%${query}%`)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(whereClause);

    const data = await db
      .select({
        id: customers.id,
        ownerId: customers.ownerId,
        ownerName: users.name,
        ownerBusinessName: users.businessName,
        packageId: customers.packageId,
        packageName: packages.name,
        packageSpeed: packages.speed,
        packagePrice: packages.price,
        name: customers.name,
        phone: customers.phone,
        nik: customers.nik,
        address: customers.address,
        billingDate: customers.billingDate,
        discount: customers.discount,
        totalBill: customers.totalBill,
        status: customers.status,
        registerDate: customers.registerDate,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(users, eq(customers.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(whereClause)
      .orderBy(customers.name)
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
    const [customer] = await db
      .select({
        id: customers.id,
        ownerId: customers.ownerId,
        ownerName: users.name,
        ownerBusinessName: users.businessName,
        packageId: customers.packageId,
        packageName: packages.name,
        packageSpeed: packages.speed,
        packagePrice: packages.price,
        name: customers.name,
        phone: customers.phone,
        nik: customers.nik,
        address: customers.address,
        billingDate: customers.billingDate,
        discount: customers.discount,
        totalBill: customers.totalBill,
        status: customers.status,
        registerDate: customers.registerDate,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(users, eq(customers.ownerId, users.id))
      .leftJoin(packages, eq(customers.packageId, packages.id))
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) throw new NotFoundError('Pelanggan tidak ditemukan');

    if (role === 'mitra' && customer.ownerId !== userId) {
      throw new ForbiddenError('Anda tidak memiliki akses ke pelanggan ini');
    }

    return customer;
  }

  async create(data: CreateCustomerInput, userId: string, role: string, ipAddress: string) {
    const ownerId = role === 'superadmin' && data.ownerId ? data.ownerId : userId;

    const [pkg] = await db.select().from(packages).where(eq(packages.id, data.packageId)).limit(1);
    if (!pkg) throw new NotFoundError('Paket tidak ditemukan');
    if (!pkg.isActive) throw new AppError(400, 'Paket sudah tidak aktif');

    const totalBill = pkg.price - (data.discount || 0);
    if (totalBill < 0) throw new AppError(400, 'Diskon tidak boleh melebihi harga paket');

    const [customer] = await db.insert(customers).values({
      ownerId,
      packageId: data.packageId,
      name: data.name,
      phone: data.phone,
      nik: data.nik,
      address: data.address,
      billingDate: data.billingDate,
      discount: data.discount || 0,
      totalBill,
      notes: data.notes,
      registerDate: data.registerDate || new Date().toISOString().split('T')[0],
    }).returning();

    await db.insert(activityLogs).values({
      userId,
      action: 'customers.create',
      resource: 'customers',
      resourceId: customer.id,
      metadata: { name: data.name, ownerId },
      ipAddress,
    });

    return customer;
  }

  async update(id: string, data: UpdateCustomerInput, userId: string, role: string, ipAddress: string) {
    const [existing] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Pelanggan tidak ditemukan');

    if (role === 'mitra') {
      if (existing.ownerId !== userId) {
        throw new ForbiddenError('Anda tidak memiliki akses ke pelanggan ini');
      }
      // Mitra only can edit phone and discount
      const allowedFields = { phone: data.phone, discount: data.discount };
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (allowedFields.phone !== undefined) updateData.phone = allowedFields.phone;
      if (allowedFields.discount !== undefined) {
        const [pkg] = await db.select().from(packages).where(eq(packages.id, existing.packageId)).limit(1);
        const newTotalBill = pkg.price - allowedFields.discount;
        if (newTotalBill < 0) throw new AppError(400, 'Diskon tidak boleh melebihi harga paket');
        updateData.discount = allowedFields.discount;
        updateData.totalBill = newTotalBill;
      }

      const [updated] = await db.update(customers).set(updateData).where(eq(customers.id, id)).returning();
      return updated;
    }

    // Superadmin can edit all fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.nik !== undefined) updateData.nik = data.nik;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.billingDate !== undefined) updateData.billingDate = data.billingDate;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;

    let packagePrice = 0;
    if (data.packageId !== undefined) {
      const [pkg] = await db.select().from(packages).where(eq(packages.id, data.packageId)).limit(1);
      if (!pkg) throw new NotFoundError('Paket tidak ditemukan');
      updateData.packageId = data.packageId;
      packagePrice = pkg.price;
    } else {
      const [pkg] = await db.select().from(packages).where(eq(packages.id, existing.packageId)).limit(1);
      packagePrice = pkg.price;
    }

    const discount = data.discount !== undefined ? data.discount : existing.discount;
    updateData.discount = discount;
    updateData.totalBill = packagePrice - discount;

    if ((updateData.totalBill as number) < 0) throw new AppError(400, 'Diskon tidak boleh melebihi harga paket');

    const [updated] = await db.update(customers).set(updateData).where(eq(customers.id, id)).returning();

    await db.insert(activityLogs).values({
      userId,
      action: 'customers.update',
      resource: 'customers',
      resourceId: id,
      ipAddress,
    });

    return updated;
  }

  async remove(id: string, userId: string, ipAddress: string) {
    const [existing] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Pelanggan tidak ditemukan');

    await db.delete(customers).where(eq(customers.id, id));

    await db.insert(activityLogs).values({
      userId,
      action: 'customers.delete',
      resource: 'customers',
      resourceId: id,
      metadata: { name: existing.name },
      ipAddress,
    });

    return { message: 'Pelanggan berhasil dihapus' };
  }

  async toggleIsolate(id: string, isolated: boolean, userId: string, ipAddress: string) {
    const [existing] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Pelanggan tidak ditemukan');

    const newStatus = isolated ? 'isolated' : 'active';

    const [updated] = await db.update(customers)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId,
      action: isolated ? 'customers.isolate' : 'customers.activate',
      resource: 'customers',
      resourceId: id,
      metadata: { name: existing.name, status: newStatus },
      ipAddress,
    });

    return updated;
  }
}

export const customersService = new CustomersService();
