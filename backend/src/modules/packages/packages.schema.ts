import { z } from 'zod';

export const createPackageSchema = z.object({
  name: z.string().min(1).max(255),
  speed: z.string().min(1).max(50),
  price: z.number().int().positive('Harga harus lebih dari 0'),
  description: z.string().optional(),
});

export const updatePackageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  speed: z.string().min(1).max(50).optional(),
  price: z.number().int().positive('Harga harus lebih dari 0').optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
