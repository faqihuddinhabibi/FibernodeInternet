import { Router, type Request, type Response } from 'express';
import { usersService } from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import { authMiddleware } from '../../middleware/auth.js';
import { roleGuard } from '../../middleware/roleGuard.js';

const router = Router();

router.use(authMiddleware, roleGuard('superadmin'));

router.get('/', async (_req: Request, res: Response) => {
  const data = await usersService.list();
  res.json({ data });
});

router.post('/', async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const user = await usersService.create(data, req.user!.userId, ipAddress);
  res.status(201).json({ data: user });
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = await usersService.getById(req.params.id as string);
  res.json({ data: user });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const user = await usersService.update(req.params.id as string, data, req.user!.userId, ipAddress);
  res.json({ data: user });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const ipAddress = (req.ip || req.socket.remoteAddress || '0.0.0.0') as string;
  const user = await usersService.softDelete(req.params.id as string, req.user!.userId, ipAddress);
  res.json({ data: user });
});

export const usersRouter = router;
