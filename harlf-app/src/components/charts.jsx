// Shared, premium-styled Recharts tooltip.
export function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg border border-line px-3 py-2 shadow-card">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.stroke || p.fill }} />
            {p.name}
          </span>
          <span className="num text-[11.5px] font-semibold text-slate-100">
            {prefix}{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

export const axisStyle = {
  fontSize: 10.5,
  fontFamily: "'JetBrains Mono', monospace",
  fill: '#64748B',
}

export const gridStroke = 'rgba(148,163,184,0.07)'
