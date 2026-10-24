// Beautiful skeleton blocks — never leave a blank dark void.
export default function LoadingState({ rows = 3, height = 'h-64', label = 'Loading analytics…' }) {
  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</span>
      </div>
      <div className={`skeleton w-full ${height}`} />
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full" style={{ opacity: 1 - i * 0.25 }} />
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 'h-72', label }) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label || 'Loading chart data…'}</span>
      </div>
      <div className={`skeleton ${height}`} />
    </div>
  )
}
