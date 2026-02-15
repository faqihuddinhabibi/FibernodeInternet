import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { waSessions } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { getIO } from './socket.js';
import path from 'path';
import fs from 'fs';

const waLogger = pino({ level: 'silent' });
const sessions = new Map<string, WASocket>();
const sessionLocks = new Map<string, boolean>();

const WA_SESSIONS_DIR = process.env.NODE_ENV === 'production'
  ? '/app/wa-sessions'
  : path.join(process.cwd(), 'wa-sessions');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function updateSessionStatus(userId: string, status: 'disconnected' | 'connecting' | 'connected', phoneNumber?: string) {
  const [existing] = await db.select().from(waSessions).where(eq(waSessions.userId, userId)).limit(1);
  if (existing) {
    await db.update(waSessions).set({
      status,
      phoneNumber: phoneNumber || existing.phoneNumber,
      lastConnectedAt: status === 'connected' ? new Date() : existing.lastConnectedAt,
      updatedAt: new Date(),
    }).where(eq(waSessions.userId, userId));
  } else {
    await db.insert(waSessions).values({
      userId,
      status,
      phoneNumber,
    });
  }
}

export async function createSession(userId: string): Promise<WASocket> {
  if (sessionLocks.get(userId)) {
    throw new Error('Koneksi WA sedang dalam proses. Tunggu sebentar.');
  }

  sessionLocks.set(userId, true);

  try {
    const authDir = path.join(WA_SESSIONS_DIR, userId);
    ensureDir(authDir);

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, waLogger),
      },
      logger: waLogger,
      browser: Browsers.ubuntu('FiberNode'),
      printQRInTerminal: false,
    });

    sessions.set(userId, sock);
    await updateSessionStatus(userId, 'connecting');

    sock.ev.process(async (events) => {
      if (events['connection.update']) {
        const { connection, lastDisconnect, qr } = events['connection.update'];

        if (qr) {
          try {
            const io = getIO();
            io.to(userId).emit('wa:qr', qr);
          } catch {
            // Socket.IO not ready
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          sessions.delete(userId);
          await updateSessionStatus(userId, shouldReconnect ? 'connecting' : 'disconnected');

          try {
            const io = getIO();
            io.to(userId).emit('wa:disconnected', { shouldReconnect });
          } catch {
            // Socket.IO not ready
          }

          if (shouldReconnect) {
            logger.info({ userId }, 'WA session reconnecting...');
            sessionLocks.delete(userId);
            setTimeout(() => createSession(userId), 3000);
          } else {
            logger.info({ userId }, 'WA session logged out');
            sessionLocks.delete(userId);
          }
          return;
        }

        if (connection === 'open') {
          const phoneNumber = sock.user?.id?.split(':')[0] || '';
          await updateSessionStatus(userId, 'connected', phoneNumber);

          try {
            const io = getIO();
            io.to(userId).emit('wa:connected', { phoneNumber });
          } catch {
            // Socket.IO not ready
          }

          logger.info({ userId, phoneNumber }, 'WA session connected');
        }
      }

      if (events['creds.update']) {
        await saveCreds();
      }
    });

    return sock;
  } finally {
    sessionLocks.delete(userId);
  }
}

export function getSession(userId: string): WASocket | undefined {
  return sessions.get(userId);
}

export async function disconnectSession(userId: string): Promise<void> {
  const sock = sessions.get(userId);
  if (sock) {
    await sock.logout();
    sessions.delete(userId);
  }
  await updateSessionStatus(userId, 'disconnected');
}

export function toJid(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

export async function sendMessage(userId: string, phone: string, content: string): Promise<boolean> {
  const sock = getSession(userId);
  if (!sock) return false;

  try {
    const jid = toJid(phone);
    await sock.sendMessage(jid, { text: content });
    return true;
  } catch (error) {
    logger.error({ userId, phone, error }, 'Failed to send WA message');
    return false;
  }
}

export async function isOnWhatsApp(userId: string, phone: string): Promise<boolean> {
  const sock = getSession(userId);
  if (!sock) return false;

  try {
    const results = await sock.onWhatsApp(phone);
    const result = results?.[0];
    return Boolean(result?.exists);
  } catch {
    return false;
  }
}

export async function restoreAllSessions(): Promise<void> {
  ensureDir(WA_SESSIONS_DIR);

  const connectedSessions = await db.select().from(waSessions)
    .where(eq(waSessions.status, 'connected'));

  for (const session of connectedSessions) {
    const authDir = path.join(WA_SESSIONS_DIR, session.userId);
    if (fs.existsSync(authDir)) {
      logger.info({ userId: session.userId }, 'Restoring WA session...');
      try {
        await createSession(session.userId);
      } catch (error) {
        logger.error({ userId: session.userId, error }, 'Failed to restore WA session');
      }
    }
  }
}
