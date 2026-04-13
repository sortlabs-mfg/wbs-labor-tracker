import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_number TEXT PRIMARY KEY,
      job_name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS wbs_estimates (
      id SERIAL PRIMARY KEY,
      job_number TEXT NOT NULL,
      job_name TEXT,
      wbs_code TEXT NOT NULL,
      wbs_name TEXT NOT NULL,
      estimated_hrs NUMERIC NOT NULL,
      labor_rate NUMERIC DEFAULT 55,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(job_number, wbs_code)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id SERIAL PRIMARY KEY,
      employee_id TEXT,
      first_name TEXT,
      last_name TEXT,
      work_date DATE,
      wbs_code TEXT,
      wbs_name TEXT,
      job_number TEXT,
      job_name TEXT,
      hours NUMERIC,
      pay_type TEXT,
      import_batch TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export default pool;
