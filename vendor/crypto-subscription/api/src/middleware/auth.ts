import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Lightweight API key authentication middleware.
 *
 * - Expects header: `Authorization: Bearer <API_KEY>`
 * - Compares against keys from env:
 *   - `API_KEYS` (comma-separated list), or
 *   - `API_KEY` (single key) as fallback
 * - If valid: calls next()
 * - If invalid: returns 401 Unauthorized
 */
export default function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.header('Authorization') || req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized request: missing or malformed Authorization header', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.substring('Bearer '.length).trim();
    if (!token) {
      logger.warn('Unauthorized request: empty bearer token', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const multi = (process.env.API_KEYS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const single = (process.env.API_KEY || '').trim();

    const allowedKeys = new Set<string>([...multi, ...(single ? [single] : [])]);

    if (allowedKeys.size === 0) {
      logger.warn('Auth middleware is enabled but no API keys are configured. Denying access by default.');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedKeys.has(token)) {
      logger.warn('Unauthorized request: invalid API key', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    return next();
  } catch (err) {
    logger.error('Auth middleware error', err as any);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
