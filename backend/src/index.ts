import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { initSocket } from './lib/socket.js';
import { restoreAllSessions } from './lib/wa-manager.js';
import { startScheduler } from './modules/whatsapp/wa.scheduler.js';

import { authRouter } from './modules/auth/auth.controller.js';
import { usersRouter } from './modules/users/users.controller.js';
import { packagesRouter } from './modules/packages/packages.controller.js';
import { customersRouter } from './modules/customers/customers.controller.js';
import { invoicesRouter } from './modules/invoices/invoices.controller.js';
import { financeRouter } from './modules/finance/finance.controller.js';
import { waRouter } from './modules/whatsapp/wa.controller.js';
import { settingsRouter } from './modules/settings/settings.controller.js';
import { dashboardRouter } from './modules/dashboard/dashboard.controller.js';
import { uploadsRouter } from './modules/uploads/uploads.controller.js';

const app = express();
const httpServer = createServer(app);

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

// Initialize Socket.IO
initSocket(httpServer);

// Global middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Static files
const uploadsDir = env.NODE_ENV === 'production'
  ? '/app/uploads'
  : path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/finance', financeRouter);
app.use('/api/wa', waRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', uploadsRouter);

// Receipt endpoint (public)
app.get('/api/receipt/:token', async (req, res) => {
  const { invoicesService } = await import('./modules/invoices/invoices.service.js');
  const invoice = await invoicesService.getByReceiptToken(req.params.token);
  res.json({ data: invoice });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;

httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);

  // Restore WA sessions
  try {
    await restoreAllSessions();
    logger.info('WA sessions restored');
  } catch (error) {
    logger.error({ error }, 'Failed to restore WA sessions');
  }

  // Start scheduler
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
