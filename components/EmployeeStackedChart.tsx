'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EmployeeWbsRow {
  employee_name: string;
  wbs_code: string;
  wbs_name: string;
  hours: number;
}

interface EmployeeStackedChartProps {
  data: EmployeeWbsRow[];
}

const COLORS = [
  '#185FA5',
  '#1D9E75',
  '#E24B4A',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

export default function EmployeeStackedChart({ data }: EmployeeStackedChartProps) {
  if (!data.length) {
    return <div className="text-slate-400 text-sm text-center py-8">No data to display</div>;
  }

  // Get unique WBS codes and employee names
  const wbsCodes = Array.from(new Set(data.map((d) => d.wbs_code)));
  const employees = Array.from(new Set(data.map((d) => d.employee_name)));

  // Build chart data: one row per employee, keys are wbs_codes
  const chartData = employees.map((emp) => {
    const row: Record<string, string | number> = { employee: emp };
    for (const wbs of wbsCodes) {
      const match = data.find((d) => d.employee_name === emp && d.wbs_code === wbs);
      row[wbs] = match ? Number(match.hours) : 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="employee"
          tick={{ fontSize: 10 }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} hrs`]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {wbsCodes.map((wbs, i) => {
          const wbsRow = data.find((d) => d.wbs_code === wbs);
          return (
            <Bar
              key={wbs}
              dataKey={wbs}
              name={wbsRow ? `${wbs} ${wbsRow.wbs_name}` : wbs}
              stackId="a"
              fill={COLORS[i % COLORS.length]}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
