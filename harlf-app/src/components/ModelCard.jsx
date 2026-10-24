import { motion } from 'framer-motion'
import { CheckCircle2, Cpu } from 'lucide-react'
import { MetricBadge, StatusDot, Bar } from './ui.jsx'

// ML Model Lab module — research-panel treatment, not a plain card.
export default function ModelCard({ model, rank, delay = 0 }) {
  const metrics = [
    { label: 'MAE', value: model.mae.toFixed(3) },
    { label: 'RMSE', value: model.rmse.toFixed(3) },
    { label: 'R²', value: model.r2.toFixed(3) },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-xl border border-line bg-ink-850/80 p-5 shadow-card"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `${model.color}22` }} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 font-mono text-[11px] font-bold" style={{ color: model.color }}>
            {model.short}
          </span>
          <div>
            <div className="text-[13.5px] font-semibold text-slate-100">{model.name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-slate-500">
              <StatusDot tone="up" /> {model.status} · {model.version}
            </div>
          </div>
        </div>
        <MetricBadge tone={rank === 0 ? 'up' : 'neutral'}>RANK #{rank + 1}</MetricBadge>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-ink-900/60">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-2.5 text-center">
            <div className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-slate-600">{m.label}</div>
            <div className="num mt-0.5 text-[13px] font-semibold text-slate-200">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Validation confidence</span>
          <span className="num font-semibold text-slate-200">{model.confidence}%</span>
        </div>
        <Bar value={model.confidence} color={model.color} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
          <Cpu className="h-3 w-3" /> {model.trainState}
        </span>
        <span className="num text-[12px] font-semibold" style={{ color: model.prediction >= 0 ? '#34D399' : '#F87171' }}>
          {model.prediction >= 0 ? '+' : ''}{model.prediction.toFixed(2)}% <span className="font-sans text-[9.5px] font-normal text-slate-600">pred</span>
        </span>
      </div>
    </motion.div>
  )
}
