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
  Cell,
} from 'recharts';

interface WbsDataPoint {
  wbs_code: string;
  wbs_name: string;
  actual_hrs: number;
  estimated_hrs: number;
}

interface WbsBarChartProps {
  data: WbsDataPoint[];
}

const BLUE = '#185FA5';
const RED = '#E24B4A';
const GREEN = '#1D9E75';

export default function WbsBarChart({ data }: WbsBarChartProps) {
  if (!data.length) {
    return <div className="text-slate-400 text-sm text-center py-8">No data to display</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="wbs_code"
          tick={{ fontSize: 11 }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)} hrs`]}
          labelFormatter={(label) => {
            const row = data.find((d) => d.wbs_code === label);
            return row ? `${label} – ${row.wbs_name}` : label;
          }}
        />
        <Legend />
        <Bar dataKey="estimated_hrs" name="Estimated" fill={BLUE} />
        <Bar dataKey="actual_hrs" name="Actual">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.actual_hrs > entry.estimated_hrs ? RED : GREEN}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
