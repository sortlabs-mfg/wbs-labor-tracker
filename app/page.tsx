'use client';

import { useEffect, useState, useCallback } from 'react';
import MetricCard from '@/components/MetricCard';
import WbsBarChart from '@/components/WbsBarChart';
import EmployeeStackedChart from '@/components/EmployeeStackedChart';

interface Job {
  job_number: string;
  job_name: string;
  status: string;
}

interface WbsEntry {
  wbs_code: string;
  wbs_name: string;
  actual_hrs: number;
  estimated_hrs: number;
}

interface ByEmployee {
  employee_name: string;
  wbs_code: string;
  wbs_name: string;
  hours: string;
}

interface DetailRow {
  employee_name: string;
  job_number: string;
  job_name: string;
  wbs_code: string;
  wbs_name: string;
  hours: string;
  work_date: string;
}

interface Metrics {
  totalEstimated: number;
  totalActual: number;
  variance: number;
  activitiesOver: number;
}

interface DashboardData {
  byWbs: WbsEntry[];
  byEmployee: ByEmployee[];
  metrics: Metrics;
  details: DetailRow[];
  employees: string[];
  jobs: Job[];
}

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

const EMPTY_DATA: DashboardData = {
  byWbs: [],
  byEmployee: [],
  metrics: { totalEstimated: 0, totalActual: 0, variance: 0, activitiesOver: 0 },
  details: [],
  employees: [],
  jobs: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    job: '',
    employee: '',
    month: '',
    year: String(currentYear),
  });
  const [sortCol, setSortCol] = useState<string>('work_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tableFilter, setTableFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.job) params.set('job', filters.job);
      if (filters.employee) params.set('employee', filters.employee);
      if (filters.month) params.set('month', filters.month);
      if (filters.year) params.set('year', filters.year);
      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json();
      if (json && !json.error) {
        setData({
          byWbs: json.byWbs ?? [],
          byEmployee: json.byEmployee ?? [],
          metrics: json.metrics ?? { totalEstimated: 0, totalActual: 0, variance: 0, activitiesOver: 0 },
          details: json.details ?? [],
          employees: json.employees ?? [],
          jobs: json.jobs ?? [],
        });
      }
    } catch (err) {
      console.error('[dashboard] fetch error:', err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { totalEstimated, totalActual, variance, activitiesOver } = data.metrics;
  const variancePct = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;

  const sortedDetail = (() => {
    let rows = [...data.details];
    if (tableFilter) {
      const f = tableFilter.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(f) ||
          r.job_number.toLowerCase().includes(f) ||
          r.job_name.toLowerCase().includes(f) ||
          r.wbs_code.toLowerCase().includes(f) ||
          r.wbs_name.toLowerCase().includes(f)
      );
    }
    rows.sort((a, b) => {
      const aVal = String(a[sortCol as keyof DetailRow] ?? '');
      const bVal = String(b[sortCol as keyof DetailRow] ?? '');
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  })();

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {/* Filter Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Job</label>
          <select
            value={filters.job}
            onChange={(e) => setFilters({ ...filters, job: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white min-w-[180px]"
          >
            <option value="">All Jobs</option>
            {data.jobs.map((j) => (
              <option key={j.job_number} value={j.job_number}>
                {j.job_number} – {j.job_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Employee</label>
          <select
            value={filters.employee}
            onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white min-w-[160px]"
          >
            <option value="">All Employees</option>
            {data.employees.map((emp) => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setFilters({ job: '', employee: '', month: '', year: '' })}
          className="text-xs text-slate-500 hover:text-slate-700 underline self-end pb-1.5"
        >
          Clear filters
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading...</div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Total Estimated Hrs" value={totalEstimated.toFixed(1)} />
            <MetricCard title="Total Actual Hrs" value={totalActual.toFixed(1)} />
            <MetricCard
              title="Variance"
              value={`${variance >= 0 ? '+' : ''}${variance.toFixed(1)} hrs`}
              subtitle={`${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%`}
              variant={variance > 0 ? 'red' : variance < 0 ? 'green' : 'default'}
            />
            <MetricCard
              title="Activities Over Estimate"
              value={activitiesOver}
              variant={activitiesOver > 0 ? 'red' : 'default'}
            />
          </div>

          {/* WBS Grouped Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Estimated vs Actual Hours by WBS Code
            </h2>
            <WbsBarChart data={data.byWbs} />
          </div>

          {/* Employee Stacked Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Hours by Employee (Stacked by WBS)
            </h2>
            <EmployeeStackedChart
              data={data.byEmployee.map((r) => ({ ...r, hours: Number(r.hours) }))}
            />
          </div>

          {/* Detail Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Detail</h2>
              <input
                type="text"
                placeholder="Filter table..."
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-48"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      { key: 'employee_name', label: 'Employee' },
                      { key: 'job_number', label: 'Job #' },
                      { key: 'job_name', label: 'Job Name' },
                      { key: 'wbs_code', label: 'WBS Code' },
                      { key: 'wbs_name', label: 'WBS Activity' },
                      { key: 'hours', label: 'Actual Hrs' },
                      { key: 'work_date', label: 'Date' },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wide cursor-pointer hover:bg-slate-100 whitespace-nowrap select-none"
                      >
                        {label}{sortCol === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedDetail.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No data matching current filters
                      </td>
                    </tr>
                  ) : (
                    sortedDetail.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 whitespace-nowrap">{row.employee_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{row.job_number}</td>
                        <td className="px-4 py-2">{row.job_name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.wbs_code}</td>
                        <td className="px-4 py-2">{row.wbs_name}</td>
                        <td className="px-4 py-2 text-right">{Number(row.hours).toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-500 text-xs">
                          {row.work_date ? new Date(row.work_date).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
              {sortedDetail.length} rows
            </div>
          </div>
        </>
      )}
    </div>
  );
}
