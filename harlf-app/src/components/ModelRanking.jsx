import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Bar, MetricBadge } from './ui.jsx'

// Horizontal animated model ranking (MODEL ARENA bars).
export default function ModelRanking({ rows, metric = 'Accuracy', getScore, getDisplay, selected, onSelect }) {
  const best = Math.max(...rows.map(getScore))
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slate-500">{metric}</span>
        <span className="font-mono text-[9.5px] text-slate-600">normalized 0–100</span>
      </div>
      {rows.map((m, i) => {
        const score = getScore(m)
        const isBest = score === best
        const isSel = selected === m.id
        return (
          <button key={m.id} onClick={() => onSelect?.(m.id)}
            className={`group block w-full rounded-lg border px-3.5 py-3 text-left transition-colors ${isSel ? 'border-accent/30 bg-accent/[0.05]' : 'border-transparent hover:border-line hover:bg-white/[0.02]'}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-slate-200">
                {isBest && <Trophy className="h-3.5 w-3.5 text-warn" />}
                {m.name}
              </span>
              <span className="flex items-center gap-2">
                {isBest && <MetricBadge tone="warn">LEADER</MetricBadge>}
                <span className="num text-[12px] font-semibold text-slate-100">{getDisplay(m)}</span>
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
            >
              <Bar value={score} color={isBest ? '#FBBF24' : m.color} delay={0.15 + i * 0.1} />
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}
