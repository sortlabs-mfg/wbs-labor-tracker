import { NextRequest, NextResponse } from 'next/server';
import { query, runMigrations } from '@/lib/db';

let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

export async function GET() {
  await ensureMigrated();
  const result = await query(
    'SELECT * FROM jobs ORDER BY job_number ASC'
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const { job_number, job_name, status } = await req.json();

  if (!job_number || !job_name) {
    return NextResponse.json({ error: 'job_number and job_name required' }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO jobs (job_number, job_name, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (job_number) DO UPDATE SET job_name = EXCLUDED.job_name, status = EXCLUDED.status
     RETURNING *`,
    [job_number, job_name, status || 'active']
  );
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  await ensureMigrated();
  const { job_number, status, job_name } = await req.json();

  if (!job_number) {
    return NextResponse.json({ error: 'job_number required' }, { status: 400 });
  }

  const result = await query(
    `UPDATE jobs SET status = COALESCE($2, status), job_name = COALESCE($3, job_name)
     WHERE job_number = $1 RETURNING *`,
    [job_number, status, job_name]
  );
  return NextResponse.json(result.rows[0]);
}
