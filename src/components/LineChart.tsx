export type LineSeries = { label: string; values: number[]; color: string };

// Hand-rolled SVG multi-series line chart — same no-library convention as
// BarChart.tsx/DonutChart.tsx. Built for trends a bar chart doesn't read
// well as (a running cash balance, revenue vs. expenses over the same
// months) — values can go negative (e.g. a month with a net loss), which
// is why the baseline is wherever zero actually falls, not the bottom edge.
export function LineChart({
  labels,
  series,
  height = 240,
  formatValue = (v: number) => v.toFixed(0),
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = Math.max(labels.length * 70, 280);
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const max = allValues.length ? Math.max(...allValues, 0) : 1;
  const min = allValues.length ? Math.min(...allValues, 0) : 0;
  const spread = max - min || 1;

  function x(i: number) {
    return labels.length > 1
      ? padding.left + (i / (labels.length - 1)) * plotWidth
      : padding.left + plotWidth / 2;
  }
  function y(value: number) {
    return padding.top + plotHeight - ((value - min) / spread) * plotHeight;
  }
  const zeroY = y(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-full">
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
          {series.map((s) => (
            <polyline
              key={s.label}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
          ))}
          {series.map((s) =>
            s.values.map((v, i) => (
              <circle key={`${s.label}-${i}`} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
            ))
          )}
          {labels.map((label, i) => (
            <text
              key={label}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-zinc-400 text-[10px]"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-zinc-700">{s.label}</span>
            {s.values.length > 0 && (
              <span className="text-zinc-400">
                latest {formatValue(s.values[s.values.length - 1])}
              </span>
            )}
          </li>
        ))}
        {series.length === 0 && <li className="text-zinc-400">No data yet.</li>}
      </ul>
    </div>
  );
}
