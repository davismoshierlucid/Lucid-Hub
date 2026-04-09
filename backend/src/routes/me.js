import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';

const router = Router();

router.get('/me', requireAuth, requireDatabase, async (req, res, next) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, email, display_name, created_at
       FROM users WHERE cognito_sub = $1`,
      [req.user.sub]
    );
    const dbUser = rows[0] || null;
    res.json({
      cognito: { sub: req.user.sub, email: req.user.email, name: req.user.name },
      user: dbUser,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
