import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler.js';

export function roleGuard(...allowedRoles: Array<'superadmin' | 'mitra'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Akses ditolak');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Anda tidak memiliki izin untuk mengakses resource ini');
    }

    next();
  };
}
