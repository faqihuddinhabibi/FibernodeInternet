import { z } from 'zod';

export const payInvoiceSchema = z.object({
  paymentMethod: z.string().max(50).optional(),
  paymentNote: z.string().optional(),
  version: z.number().int(),
});

export const unpayInvoiceSchema = z.object({
  version: z.number().int(),
});

export const generateInvoicesSchema = z.object({
  ownerId: z.string().uuid().optional(),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type UnpayInvoiceInput = z.infer<typeof unpayInvoiceSchema>;
