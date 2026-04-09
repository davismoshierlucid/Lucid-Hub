import { Router } from 'express';
import { getPool } from '../config/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { recalculateAllCompanyScores } from '../services/priorityScore.js';

const router = Router();

router.use(requireAuth);
router.use(requireDatabase);

router.post('/admin/recalculate-all-scores', async (req, res, next) => {
  try {
    const pool = getPool();
    const count = await recalculateAllCompanyScores(pool);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;
