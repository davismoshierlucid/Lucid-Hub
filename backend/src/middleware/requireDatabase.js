import { getPool } from '../config/db.js';

/**
 * Returns 503 when the app is running without a configured database.
 */
export function requireDatabase(req, res, next) {
  if (!getPool()) {
    res.status(503).json({ message: 'Database not yet configured' });
    return;
  }
  next();
}
