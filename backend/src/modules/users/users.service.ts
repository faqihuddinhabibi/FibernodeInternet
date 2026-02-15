import { eq, and, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, customers, activityLogs } from '../../db/schema.js';
import { hashPassword } from '../../utils/password.js';
import { AppError, NotFoundError, ConflictError } from '../../middleware/errorHandler.js';
import type { CreateUserInput, UpdateUserInput } from './users.schema.js';

export class UsersService {
  async list() {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        phone: users.phone,
        businessName: users.businessName,
        bankName: users.bankName,
        bankAccount: users.bankAccount,
        bankHolder: users.bankHolder,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.role, 'mitra'))
      .orderBy(users.createdAt);

    return result;
  }

  async getById(id: string) {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        phone: users.phone,
        businessName: users.businessName,
        bankName: users.bankName,
        bankAccount: users.bankAccount,
        bankHolder: users.bankHolder,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundError('Mitra tidak ditemukan');
    return user;
  }

  async create(data: CreateUserInput, adminId: string, ipAddress: string) {
    // Check unique username
    const [existingUsername] = await db.select().from(users).where(eq(users.username, data.username)).limit(1);
    if (existingUsername) throw new AppError(400, 'Username sudah digunakan');

    // Check unique businessName
    const [existingBusiness] = await db.select().from(users).where(eq(users.businessName, data.businessName)).limit(1);
    if (existingBusiness) throw new AppError(400, 'Nama usaha sudah digunakan');

    const passwordHash = await hashPassword(data.password);

    const [user] = await db.insert(users).values({
      username: data.username,
      passwordHash,
      name: data.name,
      role: 'mitra',
      phone: data.phone,
      businessName: data.businessName,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      bankHolder: data.bankHolder,
    }).returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'users.create',
      resource: 'users',
      resourceId: user.id,
      metadata: { username: data.username, businessName: data.businessName },
      ipAddress,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, data: UpdateUserInput, adminId: string, ipAddress: string) {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Mitra tidak ditemukan');

    if (data.businessName) {
      const [dup] = await db.select().from(users)
        .where(and(eq(users.businessName, data.businessName), ne(users.id, id)))
        .limit(1);
      if (dup) throw new AppError(400, 'Nama usaha sudah digunakan');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
    if (data.bankHolder !== undefined) updateData.bankHolder = data.bankHolder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'users.update',
      resource: 'users',
      resourceId: id,
      ipAddress,
    });

    const { passwordHash: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async softDelete(id: string, adminId: string, ipAddress: string) {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) throw new NotFoundError('Mitra tidak ditemukan');

    // Check if mitra still has customers
    const [customerCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.ownerId, id));

    if (customerCount.count > 0) {
      throw new AppError(400, `Mitra masih memiliki ${customerCount.count} pelanggan. Pindahkan atau hapus pelanggan terlebih dahulu.`);
    }

    const [updated] = await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId: adminId,
      action: 'users.delete',
      resource: 'users',
      resourceId: id,
      ipAddress,
    });

    const { passwordHash: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}

export const usersService = new UsersService();
