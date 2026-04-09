import 'dotenv/config';
import app from './app.js';
import {
  isDatabaseConfigured,
  testDatabaseConnection,
} from './config/db.js';
import { startPriorityScoreCron } from './jobs/priorityScoreCron.js';
import { logAnthropicConfigWarning } from './services/claudeClient.js';

const port = parseInt(process.env.PORT || '3001', 10);

logAnthropicConfigWarning();

async function start() {
  if (!isDatabaseConfigured()) {
    console.warn(
      'WARNING: Database not configured. Running in limited mode.'
    );
  } else {
    try {
      await testDatabaseConnection();
      console.log('[database] PostgreSQL connection succeeded.');
    } catch (err) {
      console.error('[database] PostgreSQL connection failed:', err.message);
      console.error(
        '[database] Ensure DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE are set and PostgreSQL is running.'
      );
    }
  }

  app.listen(port, () => {
    console.log(`[server] Lucid Hub API listening on http://localhost:${port}`);
    startPriorityScoreCron();
  });
}

start();
