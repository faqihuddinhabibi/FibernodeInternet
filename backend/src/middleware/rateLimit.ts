import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Terlalu banyak request, coba lagi nanti',
      code: 'RATE_LIMIT',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Terlalu banyak percobaan login, coba lagi nanti',
      code: 'RATE_LIMIT',
    },
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Terlalu banyak upload, coba lagi nanti',
      code: 'RATE_LIMIT',
    },
  },
});
