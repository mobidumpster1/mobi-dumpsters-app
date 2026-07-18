export type BarSeries = { label: string; value: number; color?: string };

// Hand-rolled SVG bar chart — same convention as DonutChart.tsx (no
// charting library in this project). Bars scale against the largest value
// in the set so a single series or a mixed-magnitude set both render
// sensibly.
export function BarChart({
  bars,
  height = 220,
  color = "#2563eb",
  formatValue = (v: number) => v.toFixed(0),
}: {
  bars: BarSeries[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  const barWidth = 100 / Math.max(bars.length, 1);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid items-end gap-1.5"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`, height }}
      >
        {bars.map((bar) => {
          const pct = (Math.abs(bar.value) / max) * 100;
          return (
            <div key={bar.label} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="text-xs font-medium text-zinc-600">{formatValue(bar.value)}</span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  backgroundColor: bar.color ?? color,
                  minWidth: `${Math.max(barWidth, 4)}%`,
                }}
              />
            </div>
          );
        })}
        {bars.length === 0 && <p className="text-sm text-zinc-400">No data yet.</p>}
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      >
        {bars.map((bar) => (
          <span
            key={bar.label}
            className="truncate text-center text-[11px] text-zinc-500"
            title={bar.label}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
