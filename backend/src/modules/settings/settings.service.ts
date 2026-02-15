import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { settings, activityLogs } from '../../db/schema.js';

export class SettingsService {
  async getAll() {
    const rows = await db.select().from(settings);
    const result: Record<string, string | null> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getBranding() {
    const allSettings = await this.getAll();
    return {
      app_name: allSettings.app_name || 'FiberNode Internet',
      logo_url: allSettings.logo_url || '/logo.svg',
      favicon_url: allSettings.favicon_url || '/favicon.ico',
      splash_logo_url: allSettings.splash_logo_url || allSettings.logo_url || '/logo.svg',
      splash_bg_color: allSettings.splash_bg_color || '',
      app_version: allSettings.app_version || '0.0.0',
      meta_description: allSettings.meta_description || '',
    };
  }

  async update(data: Record<string, string | null>, userId: string, ipAddress: string) {
    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(data)) {
        const [existing] = await tx.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (existing) {
          await tx.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
        } else {
          await tx.insert(settings).values({ key, value });
        }
      }

      await tx.insert(activityLogs).values({
        userId,
        action: 'settings.update',
        resource: 'settings',
        metadata: { changes: Object.keys(data) },
        ipAddress,
      });
    });

    return this.getAll();
  }
}

export const settingsService = new SettingsService();
