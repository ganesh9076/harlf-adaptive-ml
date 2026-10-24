import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useCountUp } from '../hooks.jsx'

// ── Status dot ────────────────────────────────────────────────
export function StatusDot({ tone = 'up', className = '' }) {
  const colors = { up: 'bg-up', warn: 'bg-warn', down: 'bg-down', accent: 'bg-accent' }
  return <span className={`inline-block h-1.5 w-1.5 rounded-full animate-pulseDot ${colors[tone]} ${className}`} />
}

// ── Metric badge ──────────────────────────────────────────────
export function MetricBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line text-slate-400',
    up: 'border-up/25 bg-up/10 text-up',
    down: 'border-down/25 bg-down/10 text-down',
    accent: 'border-accent/25 bg-accent/10 text-accent-soft',
    warn: 'border-warn/25 bg-warn/10 text-warn',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

// ── Delta chip ────────────────────────────────────────────────
export function DeltaChip({ value, suffix = '%' }) {
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-medium ${up ? 'text-up' : 'text-down'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{value}{suffix}
    </span>
  )
}

// ── Animated number ───────────────────────────────────────────
export function AnimatedNumber({ value, format = (v) => v.toFixed(2), className = '' }) {
  const v = useCountUp(value)
  return <span className={`num ${className}`}>{format(v)}</span>
}

// ── Section label ─────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

// ── Card shell ────────────────────────────────────────────────
export function Card({ children, className = '', hover = true, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -2 } : undefined}
      className={`relative overflow-hidden rounded-xl border border-line bg-ink-850/80 shadow-card ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ── Progress bar ──────────────────────────────────────────────
export function Bar({ value, max = 100, color = '#22D3EE', height = 'h-1.5', delay = 0 }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-ink-700 ${height}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 12px ${color}55` }}
      />
    </div>
  )
}

// ── Logo (hierarchy glyph, no stock arrows) ───────────────────
export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="HARLF logo">
      <circle cx="16" cy="7.5" r="3" fill="#22D3EE" />
      <circle cx="7.5" cy="24" r="2.4" fill="#67E8F9" />
      <circle cx="16" cy="24" r="2.4" fill="#38BDF8" />
      <circle cx="24.5" cy="24" r="2.4" fill="#67E8F9" />
      <path d="M16 10.5v8.2M16 18.7l-8.5 3M16 18.7l8.5 3" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="18.7" r="1.4" fill="#0E7490" stroke="#22D3EE" strokeWidth="1" />
    </svg>
  )
}

// ── Empty / error states ──────────────────────────────────────
export function EmptyState({ title = 'No data available', hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="h-10 w-10 rounded-lg border border-line bg-ink-800" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function ErrorState({ title = 'Data source unreachable', hint = 'The mock engine did not respond. Retry or check the API gateway.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span className="h-2.5 w-2.5 rounded-full bg-down" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{hint}</p>
    </div>
  )
}
