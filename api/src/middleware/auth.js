import crypto from 'crypto';
import { query } from '../db/pool.js';
import { AppError } from './errors.js';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

export async function verifyAdminKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Missing or invalid Authorization header', 401, 'Unauthorized');
  }

  const key = authHeader.slice(7);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  try {
    const result = await query(
      'SELECT id FROM admin_keys WHERE key_hash = $1 AND active = true',
      [keyHash]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid API key', 401, 'Unauthorized');
    }

    // Update last used
    await query('UPDATE admin_keys SET last_used_at = NOW() WHERE key_hash = $1', [keyHash]);

    req.admin = { keyId: result.rows[0].id };
    next();
  } catch (error) {
    if (error.status) throw error;
    throw new AppError('API key verification failed', 500);
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
