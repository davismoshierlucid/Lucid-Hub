import cron from 'node-cron';
import { getPool, isDatabaseConfigured } from '../config/db.js';
import { recalculateAllCompanyScores } from '../services/priorityScore.js';
import { runDailyCadenceMaintenance } from '../services/actionEngine.js';

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
      console.log('[priority-cron] Daily jobs started');
      try {
        const pool = getPool();
        await runDailyCadenceMaintenance(pool);
        console.log('[priority-cron] Cadence maintenance completed');
        const count = await recalculateAllCompanyScores(pool);
        console.log(
          '[priority-cron] Priority scores refreshed:',
          count,
          'companies'
        );
      } catch (err) {
        console.error('[priority-cron] Bulk score refresh failed:', err.message);
      }
    }
  );
}
