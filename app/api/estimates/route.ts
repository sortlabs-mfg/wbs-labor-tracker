import { NextRequest, NextResponse } from 'next/server';
import { query, runMigrations } from '@/lib/db';
import { WBS_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

export async function GET() {
  try {
    await ensureMigrated();
    const result = await query(
      `SELECT e.*, j.status as job_status
       FROM wbs_estimates e
       LEFT JOIN jobs j ON e.job_number = j.job_number
       ORDER BY e.job_number, e.wbs_code`
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('[estimates] GET error:', err);
    return NextResponse.json({ error: 'Failed to load estimates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureMigrated();
    const body = await req.json();

    // Bulk import: array of rows
    if (Array.isArray(body)) {
      const results = [];
      for (const row of body) {
        const { job_number, job_name, wbs_code, estimated_hrs, labor_rate } = row;
        const wbs_name = WBS_CODES[wbs_code] || row.wbs_name || wbs_code;
        const r = await query(
          `INSERT INTO wbs_estimates (job_number, job_name, wbs_code, wbs_name, estimated_hrs, labor_rate)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (job_number, wbs_code) DO UPDATE
           SET estimated_hrs = EXCLUDED.estimated_hrs, labor_rate = EXCLUDED.labor_rate, job_name = EXCLUDED.job_name
           RETURNING *`,
          [job_number, job_name || '', wbs_code, wbs_name, estimated_hrs, labor_rate || 55]
        );
        results.push(r.rows[0]);
      }
      return NextResponse.json(results);
    }

    // Single row
    const { job_number, job_name, wbs_code, wbs_name, estimated_hrs, labor_rate } = body;
    const resolvedName = wbs_name || WBS_CODES[wbs_code] || wbs_code;

    if (!job_number || !wbs_code || estimated_hrs === undefined) {
      return NextResponse.json({ error: 'job_number, wbs_code, estimated_hrs required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO wbs_estimates (job_number, job_name, wbs_code, wbs_name, estimated_hrs, labor_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (job_number, wbs_code) DO UPDATE
       SET estimated_hrs = EXCLUDED.estimated_hrs, labor_rate = EXCLUDED.labor_rate,
           job_name = EXCLUDED.job_name, wbs_name = EXCLUDED.wbs_name
       RETURNING *`,
      [job_number, job_name || '', wbs_code, resolvedName, estimated_hrs, labor_rate || 55]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('[estimates] POST error:', err);
    return NextResponse.json({ error: 'Failed to save estimate' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureMigrated();
    const { id, job_number, job_name, wbs_code, wbs_name, estimated_hrs, labor_rate } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE wbs_estimates
       SET job_number = COALESCE($2, job_number),
           job_name = COALESCE($3, job_name),
           wbs_code = COALESCE($4, wbs_code),
           wbs_name = COALESCE($5, wbs_name),
           estimated_hrs = COALESCE($6, estimated_hrs),
           labor_rate = COALESCE($7, labor_rate)
       WHERE id = $1 RETURNING *`,
      [id, job_number, job_name, wbs_code, wbs_name, estimated_hrs, labor_rate]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('[estimates] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureMigrated();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await query('DELETE FROM wbs_estimates WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[estimates] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
  }
}
