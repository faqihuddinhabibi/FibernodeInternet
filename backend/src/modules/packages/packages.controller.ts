import { Router, type Request, type Response } from 'express';
import { packagesService } from './packages.service.js';
import { createPackageSchema, updatePackageSchema } from './packages.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const activeOnly = req.query.active === 'true';
  const data = await packagesService.list(activeOnly);
  res.json({ data });
});

router.post('/', authMiddleware, roleGuard('superadmin'), async (req: Request, res: Response) => {
  const data = createPackageSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const pkg = await packagesService.create(data, req.user!.userId, ipAddress);
  res.status(201).json({ data: pkg });
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const pkg = await packagesService.getById(req.params.id as string);
  res.json({ data: pkg });
});

router.patch('/:id', authMiddleware, roleGuard('superadmin'), async (req: Request, res: Response) => {
  const data = updatePackageSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const pkg = await packagesService.update(req.params.id as string, data, req.user!.userId, ipAddress);
  res.json({ data: pkg });
});

router.delete('/:id', authMiddleware, roleGuard('superadmin'), async (req: Request, res: Response) => {
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const pkg = await packagesService.softDelete(req.params.id as string, req.user!.userId, ipAddress);
  res.json({ data: pkg });
});

export const packagesRouter = router;
