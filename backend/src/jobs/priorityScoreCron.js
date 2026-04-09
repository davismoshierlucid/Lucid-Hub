import cron from 'node-cron';
import { getPool, isDatabaseConfigured } from '../config/db.js';
import { recalculateAllCompanyScores } from '../services/priorityScore.js';

/**
 * Daily bulk priority refresh at 6:00 AM (server local time).
 */
export function startPriorityScoreCron() {
  if (!isDatabaseConfigured()) {
    console.log('[priority-cron] Scheduler not started (database not configured)');
    return;
  }
  cron.schedule(
    '0 6 * * *',
    async () => {
      if (!isDatabaseConfigured()) {
        return;
      }
      console.log('[priority-cron] Bulk score refresh started');
      try {
        const pool = getPool();
        const count = await recalculateAllCompanyScores(pool);
        console.log(
          '[priority-cron] Bulk score refresh completed:',
          count,
          'companies'
        );
      } catch (err) {
        console.error('[priority-cron] Bulk score refresh failed:', err.message);
      }
    }
  );
}
