import { z } from 'zod';

const phoneRegex = /^62\d{8,13}$/;

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().regex(phoneRegex, 'Format: 62xxxxxxxxxx (10-15 digit)'),
  packageId: z.string().uuid(),
  billingDate: z.number().int().min(1).max(28),
  discount: z.number().int().min(0).default(0),
  nik: z.string().max(20).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  registerDate: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().regex(phoneRegex, 'Format: 62xxxxxxxxxx (10-15 digit)').optional(),
  packageId: z.string().uuid().optional(),
  billingDate: z.number().int().min(1).max(28).optional(),
  discount: z.number().int().min(0).optional(),
  nik: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional(),
});

export const isolateCustomerSchema = z.object({
  isolated: z.boolean(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
