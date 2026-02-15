import { Router, type Request, type Response } from 'express';
import { waService } from './wa.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

router.get('/status', async (req: Request, res: Response) => {
  const data = await waService.getStatus(req.user!.userId);
  res.json({ data });
});

router.post('/connect', async (req: Request, res: Response) => {
  const data = await waService.connect(req.user!.userId);
  res.json({ data });
});

router.post('/disconnect', async (req: Request, res: Response) => {
  const data = await waService.disconnect(req.user!.userId);
  res.json({ data });
});

router.post('/send-test', async (req: Request, res: Response) => {
  const schema = z.object({ phone: z.string(), message: z.string() });
  const { phone, message } = schema.parse(req.body);
  const data = await waService.sendTest(req.user!.userId, phone, message);
  res.json({ data });
});

router.post('/send-manual', async (req: Request, res: Response) => {
  const schema = z.object({
    customerId: z.string().uuid(),
    invoiceId: z.string().uuid().optional(),
    template: z.enum(['reminder', 'receipt', 'isolation', 'custom']),
    customMessage: z.string().optional(),
  });
  const body = schema.parse(req.body);
  const data = await waService.sendManual(
    req.user!.userId, req.user!.role,
    body.customerId, body.template, body.customMessage, body.invoiceId
  );
  res.json({ data });
});

router.post('/send-bulk', async (req: Request, res: Response) => {
  const schema = z.object({
    customerIds: z.array(z.string().uuid()),
    template: z.enum(['reminder', 'custom']),
    customMessage: z.string().optional(),
  });
  const body = schema.parse(req.body);
  const data = await waService.sendBulk(
    req.user!.userId, req.user!.role,
    body.customerIds, body.template, body.customMessage
  );
  res.json({ data });
});

router.post('/check-number', async (req: Request, res: Response) => {
  const schema = z.object({ phone: z.string() });
  const { phone } = schema.parse(req.body);
  const data = await waService.checkNumber(req.user!.userId, phone);
  res.json({ data });
});

router.get('/logs', async (req: Request, res: Response) => {
  const { type, page, limit } = req.query;
  const data = await waService.getLogs(
    req.user!.userId, req.user!.role,
    type as string,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 20,
  );
  res.json(data);
});

router.get('/queue', async (req: Request, res: Response) => {
  const data = await waService.getQueue(req.user!.userId);
  res.json({ data });
});

router.post('/queue/:id/retry', async (req: Request, res: Response) => {
  const data = await waService.retryQueueMessage(req.params.id as string);
  res.json({ data });
});

router.delete('/queue/:id', async (req: Request, res: Response) => {
  const data = await waService.cancelQueueMessage(req.params.id as string);
  res.json({ data });
});

export const waRouter = router;
