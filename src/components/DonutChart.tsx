export type DonutSlice = { label: string; value: number; color: string };

export function DonutChart({
  slices,
  size = 180,
  thickness = 28,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth={thickness}
        />
        {total > 0 &&
          slices.map((slice) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const dashoffset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashoffset}
              />
            );
          })}
      </svg>
      <ul className="flex flex-col gap-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="capitalize text-zinc-700">{slice.label}</span>
            <span className="text-zinc-400">
              ${slice.value.toFixed(2)} (
              {total > 0 ? ((slice.value / total) * 100).toFixed(0) : 0}%)
            </span>
          </li>
        ))}
        {slices.length === 0 && (
          <li className="text-zinc-400">No expenses yet.</li>
        )}
      </ul>
    </div>
  );
}
