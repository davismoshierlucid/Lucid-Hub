import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, isDatabaseConfigured } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function run() {
  if (!isDatabaseConfigured()) {
    console.error(
      '[migrate] Database not configured. Set a real DATABASE_URL or PGUSER and PGDATABASE.'
    );
    process.exitCode = 1;
    return;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureMigrationsTable(client);

    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrate] skip ${file}`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(sqlPath, 'utf8');
      console.log(`[migrate] applying ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    }

    await client.query('COMMIT');
    console.log('[migrate] done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
