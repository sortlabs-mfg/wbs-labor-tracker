import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { query, runMigrations } from '@/lib/db';
import { SKIP_PAY_TYPES, SKIP_WBS_CODES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await runMigrations();
    migrated = true;
  }
}

interface PaylocityRow {
  'Employee Id'?: string;
  'Pay Type Description'?: string;
  'Work Date'?: string;
  'First Name'?: string;
  'Last Name'?: string;
  'WBS Code'?: string;
  'WBS Code Name'?: string;
  'Positions'?: string;
  'Positions Name'?: string;
  'Paid Duration (hours)'?: string;
  'Employee Notes'?: string;
  'Supervisor Notes'?: string;
  'Jobs'?: string;
  'Jobs Name'?: string;
}

export async function POST(req: NextRequest) {
  await ensureMigrated();

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const filename = file.name;
  const importBatch = `${filename}_${new Date().toISOString().slice(0, 10)}`;

  // Check for duplicate batch
  const existing = await query(
    'SELECT COUNT(*) as cnt FROM time_entries WHERE import_batch = $1',
    [importBatch]
  );
  if (parseInt(existing.rows[0].cnt) > 0) {
    return NextResponse.json(
      { error: `Batch "${importBatch}" was already imported. Delete existing rows first.` },
      { status: 409 }
    );
  }

  const text = await file.text();
  const { data, errors } = Papa.parse<PaylocityRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0 && data.length === 0) {
    return NextResponse.json({ error: 'CSV parse error', details: errors }, { status: 400 });
  }

  let imported = 0;
  let skippedNonExpense = 0;
  let skippedNotDefined = 0;
  let skippedPayType = 0;

  for (const row of data) {
    const payType = (row['Pay Type Description'] || '').trim();
    const jobNumber = (row['Jobs'] || '').trim();
    const wbsCode = (row['WBS Code'] || '').trim();

    // Skip non-work pay types
    if (SKIP_PAY_TYPES.some((t) => payType.toLowerCase().includes(t.toLowerCase()))) {
      skippedPayType++;
      continue;
    }

    // Skip Not Defined jobs
    if (!jobNumber || jobNumber.toLowerCase() === 'not defined') {
      skippedNotDefined++;
      continue;
    }

    // Skip NONEXPENSE WBS codes
    if (SKIP_WBS_CODES.includes(wbsCode.toUpperCase())) {
      skippedNonExpense++;
      continue;
    }

    const employeeId = (row['Employee Id'] || '').trim();
    const firstName = (row['First Name'] || '').trim();
    const lastName = (row['Last Name'] || '').trim();
    const workDate = (row['Work Date'] || '').trim();
    const wbsName = (row['WBS Code Name'] || '').trim();
    const jobName = (row['Jobs Name'] || '').trim();
    const hoursStr = (row['Paid Duration (hours)'] || '0').trim();
    const hours = parseFloat(hoursStr) || 0;

    await query(
      `INSERT INTO time_entries
         (employee_id, first_name, last_name, work_date, wbs_code, wbs_name, job_number, job_name, hours, pay_type, import_batch)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [employeeId, firstName, lastName, workDate || null, wbsCode, wbsName, jobNumber, jobName, hours, payType, importBatch]
    );

    // Upsert job
    await query(
      `INSERT INTO jobs (job_number, job_name) VALUES ($1, $2)
       ON CONFLICT (job_number) DO UPDATE SET job_name = EXCLUDED.job_name`,
      [jobNumber, jobName]
    );

    imported++;
  }

  return NextResponse.json({
    imported,
    skippedPayType,
    skippedNonExpense,
    skippedNotDefined,
    importBatch,
  });
}
