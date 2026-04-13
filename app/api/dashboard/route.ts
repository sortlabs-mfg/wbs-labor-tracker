import { NextRequest, NextResponse } from 'next/server';
import { query, runMigrations } from '@/lib/db';

export const dynamic = 'force-dynamic';

let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const { searchParams } = new URL(req.url);
  const job = searchParams.get('job') || '';
  const employee = searchParams.get('employee') || '';
  const month = searchParams.get('month') || '';
  const year = searchParams.get('year') || '';

  const conditions: string[] = ["t.pay_type = 'Work'"];
  const params: unknown[] = [];
  let idx = 1;

  if (job) {
    conditions.push(`t.job_number = $${idx++}`);
    params.push(job);
  }
  if (employee) {
    conditions.push(`(t.first_name || ' ' || t.last_name) = $${idx++}`);
    params.push(employee);
  }
  if (month) {
    conditions.push(`EXTRACT(MONTH FROM t.work_date) = $${idx++}`);
    params.push(parseInt(month));
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM t.work_date) = $${idx++}`);
    params.push(parseInt(year));
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // Actual hours per WBS
  const actualByWbs = await query(
    `SELECT t.wbs_code, t.wbs_name, SUM(t.hours) as actual_hrs, t.job_number
     FROM time_entries t
     ${whereClause}
     GROUP BY t.wbs_code, t.wbs_name, t.job_number
     ORDER BY t.wbs_code`,
    params
  );

  // Estimated hours
  let estimateConditions = '';
  const estimateParams: unknown[] = [];
  if (job) {
    estimateConditions = 'WHERE job_number = $1';
    estimateParams.push(job);
  }
  const estimates = await query(
    `SELECT job_number, wbs_code, wbs_name, estimated_hrs, labor_rate
     FROM wbs_estimates ${estimateConditions}
     ORDER BY wbs_code`,
    estimateParams
  );

  // Hours per employee by WBS
  const byEmployee = await query(
    `SELECT t.first_name || ' ' || t.last_name as employee_name,
            t.wbs_code, t.wbs_name,
            SUM(t.hours) as hours
     FROM time_entries t
     ${whereClause}
     GROUP BY employee_name, t.wbs_code, t.wbs_name
     ORDER BY employee_name, t.wbs_code`,
    params
  );

  // Detail rows
  const detail = await query(
    `SELECT t.first_name || ' ' || t.last_name as employee_name,
            t.job_number, t.job_name, t.wbs_code, t.wbs_name,
            SUM(t.hours) as hours,
            t.work_date
     FROM time_entries t
     ${whereClause}
     GROUP BY employee_name, t.job_number, t.job_name, t.wbs_code, t.wbs_name, t.work_date
     ORDER BY t.work_date DESC`,
    params
  );

  // Employees list for filter
  const employees = await query(
    `SELECT DISTINCT first_name || ' ' || last_name as employee_name
     FROM time_entries
     WHERE pay_type = 'Work'
     ORDER BY employee_name`
  );

  // Jobs list
  const jobs = await query('SELECT * FROM jobs ORDER BY job_number');

  return NextResponse.json({
    actualByWbs: actualByWbs.rows,
    estimates: estimates.rows,
    byEmployee: byEmployee.rows,
    detail: detail.rows,
    employees: employees.rows.map((r) => r.employee_name),
    jobs: jobs.rows,
  });
}
