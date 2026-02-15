import { Router, type Request, type Response } from 'express';
import { settingsService } from './settings.service.js';
import { updateSettingsSchema } from './settings.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

const router = Router();

// Public branding endpoint
router.get('/branding', async (_req: Request, res: Response) => {
  const data = await settingsService.getBranding();
  res.json({ data });
});

router.use(authMiddleware, roleGuard('superadmin'));

router.get('/', async (_req: Request, res: Response) => {
  const data = await settingsService.getAll();
  res.json({ data });
});

router.patch('/', async (req: Request, res: Response) => {
  const data = updateSettingsSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const result = await settingsService.update(data, req.user!.userId, ipAddress);
  res.json({ data: result });
});

export const settingsRouter = router;
