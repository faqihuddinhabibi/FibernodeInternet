import { Router, type Request, type Response } from 'express';
import { financeService } from './finance.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', async (req: Request, res: Response) => {
  const { period } = req.query;
  const data = await financeService.getSummary(req.user!.userId, req.user!.role, period as string);
  res.json({ data });
});

router.get('/by-period', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const data = await financeService.getByPeriod(req.user!.userId, req.user!.role, year);
  res.json({ data });
});

router.get('/by-date', async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date) {
    res.status(400).json({ error: { message: 'Parameter date wajib diisi' } });
    return;
  }
  const data = await financeService.getByDate(req.user!.userId, req.user!.role, date);
  res.json({ data });
});

router.get('/by-mitra', roleGuard('superadmin'), async (req: Request, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const data = await financeService.getByMitra(year);
  res.json({ data });
});

router.get('/export', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const data = await financeService.getByPeriod(req.user!.userId, req.user!.role, year);

  const csvRows = data.map((d) => ({
    periode: d.period,
    total_tagihan: d.totalAmount,
    terbayar: d.totalPaid,
    belum_bayar: d.totalUnpaid,
    jumlah_invoice: d.invoiceCount,
    sudah_bayar: d.paidCount,
  }));

  const headers = Object.keys(csvRows[0] || {}).join(',');
  const rows = csvRows.map((r) => Object.values(r).join(','));
  const csv = [headers, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=keuangan.csv');
  res.send(csv);
});

export const financeRouter = router;
