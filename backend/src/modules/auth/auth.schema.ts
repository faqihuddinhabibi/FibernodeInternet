import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
  currentPassword: z.string().optional(),
  phone: z.string().regex(/^62\d{8,13}$/, 'Format nomor telepon tidak valid').optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  bankHolder: z.string().max(255).optional(),
}).refine(
  (data) => {
    if (data.password && !data.currentPassword) {
      return false;
    }
    return true;
  },
  { message: 'Password lama wajib diisi untuk mengubah password', path: ['currentPassword'] }
);

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
