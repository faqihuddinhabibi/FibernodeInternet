import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { waMessageQueue, waMessageLogs, waSessions } from '../../db/schema.js';
import { sendMessage } from '../../lib/wa-manager.js';
import { logger } from '../../utils/logger.js';

const WA_RATE_CONFIG = {
  MIN_DELAY_MS: 8_000,
  MAX_DELAY_MS: 15_000,
  JITTER_MS: 5_000,
  MAX_PER_HOUR: 50,
  MAX_PER_DAY: 300,
  BATCH_SIZE: 20,
  BATCH_COOLDOWN_MS: 300_000,
  RETRY_DELAY_MS: 600_000,
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isProcessing = false;

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const activeSessions = await db.select().from(waSessions)
      .where(eq(waSessions.status, 'connected'));

    for (const session of activeSessions) {
      let batchCount = 0;

      while (true) {
        const [message] = await db.update(waMessageQueue)
          .set({ status: 'sending', updatedAt: new Date() })
          .where(
            and(
              eq(waMessageQueue.status, 'pending'),
              lte(waMessageQueue.scheduledAt, new Date()),
              eq(waMessageQueue.sessionId, session.id)
            )
          )
          .returning();

        if (!message) break;

        const success = await sendMessage(session.userId, message.phone, message.content);

        if (success) {
          await db.update(waMessageQueue)
            .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
            .where(eq(waMessageQueue.id, message.id));

          await db.insert(waMessageLogs).values({
            sessionId: session.id,
            customerId: message.customerId,
            invoiceId: message.invoiceId,
            messageType: message.messageType,
            phone: message.phone,
            content: message.content,
            status: 'sent',
          });
        } else {
          const newRetryCount = message.retryCount + 1;
          if (newRetryCount >= message.maxRetries) {
            await db.update(waMessageQueue)
              .set({ status: 'failed', errorMessage: 'Max retries exceeded', updatedAt: new Date() })
              .where(eq(waMessageQueue.id, message.id));

            await db.insert(waMessageLogs).values({
              sessionId: session.id,
              customerId: message.customerId,
              invoiceId: message.invoiceId,
              messageType: message.messageType,
              phone: message.phone,
              content: message.content,
              status: 'failed',
              errorMessage: 'Max retries exceeded',
            });
          } else {
            const retryAt = new Date(Date.now() + WA_RATE_CONFIG.RETRY_DELAY_MS);
            await db.update(waMessageQueue)
              .set({
                status: 'pending',
                retryCount: newRetryCount,
                scheduledAt: retryAt,
                updatedAt: new Date(),
              })
              .where(eq(waMessageQueue.id, message.id));
          }
        }

        batchCount++;

        if (batchCount >= WA_RATE_CONFIG.BATCH_SIZE) {
          logger.info({ sessionId: session.id }, `Batch cooldown after ${batchCount} messages`);
          await sleep(WA_RATE_CONFIG.BATCH_COOLDOWN_MS);
          batchCount = 0;
        } else {
          const delay = randomBetween(WA_RATE_CONFIG.MIN_DELAY_MS, WA_RATE_CONFIG.MAX_DELAY_MS)
            + randomBetween(0, WA_RATE_CONFIG.JITTER_MS);
          await sleep(delay);
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Queue processing error');
  } finally {
    isProcessing = false;
  }
}

export async function addToQueue(params: {
  sessionId: string;
  customerId?: string;
  invoiceId?: string;
  phone: string;
  content: string;
  messageType?: string;
  scheduledAt: Date;
}) {
  await db.insert(waMessageQueue).values({
    sessionId: params.sessionId,
    customerId: params.customerId,
    invoiceId: params.invoiceId,
    phone: params.phone,
    content: params.content,
    messageType: params.messageType || 'reminder',
    scheduledAt: params.scheduledAt,
  });
}

export async function getQueueStatus(sessionId?: string) {
  const conditions = sessionId ? [eq(waMessageQueue.sessionId, sessionId)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      pending: sql<number>`count(case when ${waMessageQueue.status} = 'pending' then 1 end)::int`,
      sending: sql<number>`count(case when ${waMessageQueue.status} = 'sending' then 1 end)::int`,
      sent: sql<number>`count(case when ${waMessageQueue.status} = 'sent' then 1 end)::int`,
      failed: sql<number>`count(case when ${waMessageQueue.status} = 'failed' then 1 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(waMessageQueue)
    .where(whereClause);

  return stats;
}
