import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Data sudah diubah oleh user lain. Silakan refresh.') {
    super(409, message, 'CONFLICT');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource tidak ditemukan') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Akses ditolak') {
    super(403, message, 'FORBIDDEN');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Tidak terautentikasi') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
