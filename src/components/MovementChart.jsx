export default function MovementChart({ data, label = 'Home odds' }) {
  const w = 260, h = 70, pad = 8;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 0.01;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / rng) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const down = data[data.length - 1] < data[0];
  return (
    <div className="halftone rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={`tabular font-bold ${down ? 'text-lime-300' : 'text-red-300'}`}>
          {data[0].toFixed(2)} → {data[data.length - 1].toFixed(2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full">
        <polyline points={pts} fill="none" stroke={down ? '#a3e635' : '#f87171'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = pad + (i / (data.length - 1)) * (w - pad * 2);
          const y = pad + (1 - (v - min) / rng) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 4 : 2} fill={down ? '#a3e635' : '#f87171'} opacity={i === data.length - 1 ? 1 : 0.5} />;
        })}
      </svg>
      <div className="mt-1 footnote">Falling = money coming. Beat the close for +CLV.</div>
    </div>
  );
}
