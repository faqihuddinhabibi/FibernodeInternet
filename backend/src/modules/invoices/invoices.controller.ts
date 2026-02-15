import { Router, type Request, type Response } from 'express';
import { invoicesService } from './invoices.service.js';
import { payInvoiceSchema, unpayInvoiceSchema, generateInvoicesSchema } from './invoices.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

const router = Router();

// Public receipt endpoint
router.get('/receipt/:token', async (req: Request, res: Response) => {
  const invoice = await invoicesService.getByReceiptToken(req.params.token as string);
  res.json({ data: invoice });
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { period, status, page, limit } = req.query;
  const result = await invoicesService.list(
    req.user!.userId,
    req.user!.role,
    period as string,
    status as string,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 20,
  );
  res.json(result);
});

router.get('/export', async (req: Request, res: Response) => {
  const { period, status } = req.query;
  const result = await invoicesService.list(
    req.user!.userId,
    req.user!.role,
    period as string,
    status as string,
    1,
    10000,
  );

  const csvRows = result.data.map((inv) => ({
    pelanggan: inv.customerName,
    telepon: inv.customerPhone,
    area: inv.ownerBusinessName,
    paket: inv.packageName,
    periode: inv.period,
    nominal: inv.amount,
    diskon: inv.discount,
    total: inv.totalAmount,
    status: inv.status,
    tanggal_bayar: inv.paidAt || '',
    metode: inv.paymentMethod || '',
    jatuh_tempo: inv.dueDate,
  }));

  const headers = Object.keys(csvRows[0] || {}).join(',');
  const rows = csvRows.map((r) => Object.values(r).join(','));
  const csv = [headers, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tagihan.csv');
  res.send(csv);
});

router.post('/generate', roleGuard('superadmin'), async (req: Request, res: Response) => {
  const data = generateInvoicesSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const result = await invoicesService.generate(data.ownerId, req.user!.userId, ipAddress);
  res.json({ data: result });
});

router.get('/:id', async (req: Request, res: Response) => {
  const invoice = await invoicesService.getById(req.params.id as string, req.user!.userId, req.user!.role);
  res.json({ data: invoice });
});

router.patch('/:id/pay', async (req: Request, res: Response) => {
  const data = payInvoiceSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const invoice = await invoicesService.markAsPaid(req.params.id as string, data, req.user!.userId, req.user!.role, ipAddress);
  res.json({ data: invoice });
});

router.patch('/:id/unpay', async (req: Request, res: Response) => {
  const data = unpayInvoiceSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const invoice = await invoicesService.markAsUnpaid(req.params.id as string, data, req.user!.userId, req.user!.role, ipAddress);
  res.json({ data: invoice });
});

export const invoicesRouter = router;
