import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(1).max(255),
  phone: z.string().regex(/^62\d{8,13}$/, 'Format nomor telepon tidak valid').optional(),
  businessName: z.string().min(1).max(255),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  bankHolder: z.string().max(255).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().regex(/^62\d{8,13}$/, 'Format nomor telepon tidak valid').optional().nullable(),
  businessName: z.string().min(1).max(255).optional(),
  bankName: z.string().max(100).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  bankHolder: z.string().max(255).optional().nullable(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
