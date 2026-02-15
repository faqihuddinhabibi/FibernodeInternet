import { Router, type Request, type Response } from 'express';
import { dashboardService } from './dashboard.service.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', async (req: Request, res: Response) => {
  const data = await dashboardService.getStats(req.user!.userId, req.user!.role);
  res.json({ data });
});

export const dashboardRouter = router;
