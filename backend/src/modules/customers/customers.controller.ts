import { Router, type Request, type Response } from 'express';
import { customersService } from './customers.service.js';
import { createCustomerSchema, updateCustomerSchema, isolateCustomerSchema } from './customers.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';
import { csvImportHandler } from './csv-import.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { q, status, page, limit } = req.query;
  const result = await customersService.list(
    req.user!.userId,
    req.user!.role,
    q as string,
    status as string,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 20,
  );
  res.json(result);
});

router.post('/', async (req: Request, res: Response) => {
  const data = createCustomerSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const customer = await customersService.create(data, req.user!.userId, req.user!.role, ipAddress);
  res.status(201).json({ data: customer });
});

router.post('/import', roleGuard('superadmin'), csvImportHandler);

router.get('/export', roleGuard('superadmin'), async (req: Request, res: Response) => {
  const { q, status } = req.query;
  const result = await customersService.list(req.user!.userId, req.user!.role, q as string, status as string, 1, 10000);

  const csvRows = result.data.map((c) => ({
    nama: c.name,
    telepon: c.phone,
    area: c.ownerBusinessName,
    paket: c.packageName,
    harga: c.packagePrice,
    diskon: c.discount,
    total_bayar: c.totalBill,
    status: c.status,
    tanggal_tagihan: c.billingDate,
    nik: c.nik || '',
  }));

  const headers = Object.keys(csvRows[0] || {}).join(',');
  const rows = csvRows.map((r) => Object.values(r).join(','));
  const csv = [headers, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=pelanggan.csv');
  res.send(csv);
});

router.get('/:id', async (req: Request, res: Response) => {
  const customer = await customersService.getById(req.params.id as string, req.user!.userId, req.user!.role);
  res.json({ data: customer });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const data = updateCustomerSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const customer = await customersService.update(req.params.id as string, data, req.user!.userId, req.user!.role, ipAddress);
  res.json({ data: customer });
});

router.delete('/:id', roleGuard('superadmin'), async (req: Request, res: Response) => {
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const result = await customersService.remove(req.params.id as string, req.user!.userId, ipAddress);
  res.json({ data: result });
});

router.patch('/:id/isolate', roleGuard('superadmin'), async (req: Request, res: Response) => {
  const { isolated } = isolateCustomerSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const customer = await customersService.toggleIsolate(req.params.id as string, isolated, req.user!.userId, ipAddress);
  res.json({ data: customer });
});

export const customersRouter = router;
