import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { getDashboardActionList } from '../services/actionEngine.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

router.get('/dashboard/action-list', async (req, res, next) => {
  try {
    const pool = getPool();
    const data = await getDashboardActionList(pool);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/stale-relationships', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, name, ticker, last_interaction, coverage_status, cadence_status
       FROM companies
       WHERE coverage_status = 'Active'
         AND (last_interaction IS NULL OR last_interaction < NOW() - INTERVAL '90 days')
         AND (cadence_status IS NULL OR cadence_status != 'process')
       ORDER BY last_interaction ASC NULLS FIRST
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/recent-activity', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.company_id,
         o.contact_id,
         o.banker_id,
         o.activity_type,
         o.activity_timestamp,
         o.subject,
         c.name AS company_name,
         u.display_name AS banker_name,
         u.email AS banker_email,
         co.first_name AS contact_first_name,
         co.last_name AS contact_last_name,
         co.email AS contact_email
       FROM outreach_activity o
       INNER JOIN companies c ON c.id = o.company_id
       LEFT JOIN users u ON u.id = o.banker_id
       LEFT JOIN contacts co ON co.id = o.contact_id
       ORDER BY o.activity_timestamp DESC NULLS LAST
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
