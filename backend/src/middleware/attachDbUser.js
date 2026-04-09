import { getPool } from '../config/db.js';

/**
 * Ensures a users row exists for the authenticated Cognito subject and sets req.dbUserId.
 * Use after requireAuth and requireDatabase.
 */
export async function attachDbUser(req, res, next) {
  try {
    const pool = getPool();
    const sub = req.user.sub;
    const email = req.user.email || 'unknown@local.invalid';
    const displayName = req.user.name || null;
    const { rows } = await pool.query(
      `INSERT INTO users (cognito_sub, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (cognito_sub) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         updated_at = now()
       RETURNING id`,
      [sub, email, displayName]
    );
    req.dbUserId = rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}
