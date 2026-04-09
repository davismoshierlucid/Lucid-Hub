import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ companies: [], contacts: [], query: '' });
      return;
    }

    const pool = getPool();
    const pattern = `%${q}%`;
    const limit = 25;

    const [companiesRes, contactsRes] = await Promise.all([
      pool.query(
        `SELECT id, name, ticker, sector, coverage_status, priority_score, data_health_score, banker_flag
         FROM companies
         WHERE name ILIKE $1 OR ticker ILIKE $1
         ORDER BY name ASC
         LIMIT $2`,
        [pattern, limit]
      ),
      pool.query(
        `SELECT c.id, c.company_id, c.first_name, c.last_name, c.email, c.title,
                co.name AS company_name
         FROM contacts c
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE
           c.email ILIKE $1
           OR c.first_name ILIKE $1
           OR c.last_name ILIKE $1
           OR (COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) ILIKE $1
         ORDER BY c.last_name ASC NULLS LAST, c.first_name ASC
         LIMIT $2`,
        [pattern, limit]
      ),
    ]);

    res.json({
      query: q,
      companies: companiesRes.rows,
      contacts: contactsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
