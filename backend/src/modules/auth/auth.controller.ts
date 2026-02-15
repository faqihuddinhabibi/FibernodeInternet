import { Router, type Request, type Response } from 'express';
import { authService } from './auth.service.js';
import { loginSchema, refreshSchema, updateProfileSchema } from './auth.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const result = await authService.login(data.username, data.password, ipAddress, userAgent);
  res.json({ data: result });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const data = refreshSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const result = await authService.refresh(data.refreshToken, ipAddress, userAgent);
  res.json({ data: result });
});

router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.json({ data: { message: 'Logout berhasil' } });
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  res.json({ data: user });
});

router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const user = await authService.updateProfile(req.user!.userId, data, ipAddress);
  res.json({ data: user });
});

export const authRouter = router;
