export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, runMigrations } from '@/lib/db';

let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

const EMPTY_RESPONSE = {
  byWbs: [],
  byEmployee: [],
  metrics: { totalEstimated: 0, totalActual: 0, variance: 0, activitiesOver: 0 },
  details: [],
  employees: [],
  jobs: [],
};

export async function GET(req: NextRequest) {
  try {
    console.log('DB URL defined:', !!process.env.DATABASE_URL);
    await ensureMigrated();
    const { searchParams } = new URL(req.url);
    const job = searchParams.get('job') || '';
    const employee = searchParams.get('employee') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    const conditions: string[] = ["t.pay_type = 'Work'"];
    const params: unknown[] = [];
    let idx = 1;

    if (job) { conditions.push(`t.job_number = $${idx++}`); params.push(job); }
    if (employee) { conditions.push(`(t.first_name || ' ' || t.last_name) = $${idx++}`); params.push(employee); }
    if (month) { conditions.push(`EXTRACT(MONTH FROM t.work_date) = $${idx++}`); params.push(parseInt(month)); }
    if (year) { conditions.push(`EXTRACT(YEAR FROM t.work_date) = $${idx++}`); params.push(parseInt(year)); }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [actualByWbsResult, estimatesResult, byEmployeeResult, detailResult, employeesResult, jobsResult] =
      await Promise.all([
        query(
          `SELECT t.wbs_code, t.wbs_name, SUM(t.hours) as actual_hrs, t.job_number
           FROM time_entries t ${whereClause}
           GROUP BY t.wbs_code, t.wbs_name, t.job_number
           ORDER BY t.wbs_code`,
          params
        ),
        query(
          `SELECT job_number, wbs_code, wbs_name, estimated_hrs, labor_rate
           FROM wbs_estimates${job ? ' WHERE job_number = $1' : ''}
           ORDER BY wbs_code`,
          job ? [job] : []
        ),
        query(
          `SELECT t.first_name || ' ' || t.last_name as employee_name,
                  t.wbs_code, t.wbs_name, SUM(t.hours) as hours
           FROM time_entries t ${whereClause}
           GROUP BY employee_name, t.wbs_code, t.wbs_name
           ORDER BY employee_name, t.wbs_code`,
          params
        ),
        query(
          `SELECT t.first_name || ' ' || t.last_name as employee_name,
                  t.job_number, t.job_name, t.wbs_code, t.wbs_name,
                  SUM(t.hours) as hours, t.work_date
           FROM time_entries t ${whereClause}
           GROUP BY employee_name, t.job_number, t.job_name, t.wbs_code, t.wbs_name, t.work_date
           ORDER BY t.work_date DESC`,
          params
        ),
        query(
          `SELECT DISTINCT first_name || ' ' || last_name as employee_name
           FROM time_entries WHERE pay_type = 'Work' ORDER BY employee_name`
        ),
        query('SELECT * FROM jobs ORDER BY job_number'),
      ]);

    // Merge estimated + actual into a single byWbs array
    const wbsMap = new Map<string, { wbs_code: string; wbs_name: string; actual_hrs: number; estimated_hrs: number }>();
    for (const e of estimatesResult.rows) {
      wbsMap.set(e.wbs_code, {
        wbs_code: e.wbs_code,
        wbs_name: e.wbs_name,
        actual_hrs: 0,
        estimated_hrs: parseFloat(e.estimated_hrs),
      });
    }
    for (const a of actualByWbsResult.rows) {
      const existing = wbsMap.get(a.wbs_code);
      if (existing) {
        existing.actual_hrs = parseFloat(a.actual_hrs);
      } else {
        wbsMap.set(a.wbs_code, {
          wbs_code: a.wbs_code,
          wbs_name: a.wbs_name,
          actual_hrs: parseFloat(a.actual_hrs),
          estimated_hrs: 0,
        });
      }
    }
    const byWbs = Array.from(wbsMap.values()).sort((a, b) => a.wbs_code.localeCompare(b.wbs_code));

    const totalEstimated = byWbs.reduce((s, r) => s + r.estimated_hrs, 0);
    const totalActual = byWbs.reduce((s, r) => s + r.actual_hrs, 0);
    const variance = totalActual - totalEstimated;
    const activitiesOver = byWbs.filter((r) => r.actual_hrs > r.estimated_hrs && r.estimated_hrs > 0).length;

    return NextResponse.json({
      byWbs,
      byEmployee: byEmployeeResult.rows,
      metrics: { totalEstimated, totalActual, variance, activitiesOver },
      details: detailResult.rows,
      employees: employeesResult.rows.map((r) => r.employee_name),
      jobs: jobsResult.rows,
    });
  } catch (err) {
    console.error('[dashboard] GET error:', err);
    return NextResponse.json(EMPTY_RESPONSE);
  }
}
