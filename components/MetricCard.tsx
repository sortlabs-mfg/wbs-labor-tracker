interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'red' | 'green';
}

export default function MetricCard({ title, value, subtitle, variant = 'default' }: MetricCardProps) {
  const valueColor =
    variant === 'red'
      ? 'text-[#E24B4A]'
      : variant === 'green'
      ? 'text-[#1D9E75]'
      : 'text-slate-800';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
