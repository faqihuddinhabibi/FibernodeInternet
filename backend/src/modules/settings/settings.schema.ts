import { z } from 'zod';

export const updateSettingsSchema = z.record(z.string(), z.string().nullable());

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
