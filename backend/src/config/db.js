import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL_PLACEHOLDER = 'placeholder_until_aws_rds_provisioned';

function isValidPostgresUrl(url) {
  return /^postgres(ql)?:\/\//i.test(url);
}

function resolvePoolConfig() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (
    rawUrl &&
    rawUrl !== DATABASE_URL_PLACEHOLDER &&
    isValidPostgresUrl(rawUrl)
  ) {
    return { connectionString: rawUrl };
  }

  const user = process.env.PGUSER?.trim();
  const database = process.env.PGDATABASE?.trim();
  if (user && database) {
    return {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user,
      password: process.env.PGPASSWORD ?? '',
      database,
    };
  }

  return null;
}

let poolInstance = null;

export function isDatabaseConfigured() {
  return resolvePoolConfig() !== null;
}

export function getPool() {
  const config = resolvePoolConfig();
  if (!config) return null;
  if (!poolInstance) {
    poolInstance = new Pool(config);
  }
  return poolInstance;
}

export async function testDatabaseConnection() {
  const pool = getPool();
  if (!pool) {
    return { ok: false, skipped: true };
  }
  const client = await pool.connect();
  try {
    await client.query('SELECT 1 AS ok');
    return { ok: true };
  } finally {
    client.release();
  }
}
