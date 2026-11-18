import React from 'react';

interface LineChartProps {
  values: number[];
  labels: string[];
  suffix?: string;
  emptyText?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  values,
  labels,
  suffix = '',
  emptyText = 'Ainda não há dados suficientes para gerar o gráfico.',
}) => {
  if (!values.length) {
    return (
      <div className="py-5 px-2 text-center text-[#999999] text-sm">
        {emptyText}
      </div>
    );
  }

  const w = 600;
  const h = 175;
  const p = 30;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;

  const points: [number, number][] = values.map((v, i) => [
    p + (values.length === 1 ? 0 : (i * (w - p * 2)) / (values.length - 1)),
    h - p - ((v - lo) / span) * (h - p * 2),
  ]);

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" role="img" aria-label="Gráfico de evolução">
        <path
          d={`M${p},${p} V${h - p} H${w - p}`}
          fill="none"
          stroke="#444444"
          strokeWidth="1"
        />
        {values.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="#ff303b"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map(([x, y], i) => (
          <circle key={`${labels[i]}-${i}`} cx={x} cy={y} r="4.5" fill="#ff303b">
            <title>{`${labels[i]}: ${values[i]}${suffix}`}</title>
          </circle>
        ))}
        <text x={p} y="14" fill="#aaaaaa" fontSize="11">
          {`${hi}${suffix}`}
        </text>
        <text x={p} y={h - 5} fill="#aaaaaa" fontSize="10">
          {labels[0]}
        </text>
        <text x={w - p} y={h - 5} textAnchor="end" fill="#aaaaaa" fontSize="10">
          {labels[labels.length - 1]}
        </text>
      </svg>
    </div>
  );
};
