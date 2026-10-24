import { motion } from 'framer-motion'
import { AnimatedNumber, DeltaChip } from './ui.jsx'

// Executive metric card with animated counter on load.
export default function StatCard({ label, value, format, delta, icon: Icon, accent, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl border border-line bg-ink-850/80 p-4 shadow-card"
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-ink-800 text-slate-500 transition-colors group-hover:text-accent">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <AnimatedNumber value={value} format={format}
          className={`text-[22px] font-semibold leading-none tracking-tight ${accent ? 'text-transparent bg-clip-text bg-gradient-to-r from-accent-soft to-accent' : 'text-slate-100'}`} />
        {delta !== undefined && <DeltaChip value={delta} />}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-slate-500">{sub}</div>}
    </motion.div>
  )
}
