import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitFork, CheckCircle2, Zap } from 'lucide-react'
import AssetSelector from '../components/AssetSelector.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useSelectedAsset } from '../hooks.jsx'
import { assetUniverse, indianAssets } from '../data/mock.js'
import { Bar, MetricBadge, StatusDot, SectionLabel } from '../components/ui.jsx'
import { getMLEvaluation } from '../api/services.js'

function Node({ label, active, tone = 'border-line text-slate-300', size = 'px-3.5 py-2 text-[11px]' }) {
  return (
    <motion.div animate={active ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 0.5 }}
      className={`relative rounded-lg border bg-ink-800 font-mono font-semibold tracking-wider ${size} ${tone} ${active ? 'shadow-glow border-accent/50 text-accent-soft' : ''}`}>
      {active && <span className="absolute inset-0 -z-10 rounded-lg bg-accent/10 blur-md" />}
      {label}
    </motion.div>
  )
}

export default function MetaSelector() {
  const [market, setMarket] = useState(() => {
  try {
    const saved = localStorage.getItem('harlf.selectedAsset')
    return saved && indianAssets.some((asset) => asset.symbol === saved)
      ? 'India'
      : 'US'
  } catch {
    return 'US'
  }
})

const [symbol, setSymbol] = useState(() => {
  try {
    return localStorage.getItem('harlf.selectedAsset') || 'NVDA'
  } catch {
    return 'NVDA'
  }
})
const [period, setPeriod] = useState('5Y')

const marketAssets =
  market === 'India'
    ? indianAssets.map((asset) => asset.symbol)
    : assetUniverse
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const [phase, setPhase] = useState('done')

const rows = useMemo(() => data?.models || [], [data])
const winner = rows.find((model) => model.id === data?.champion)


const selectionReasons = useMemo(() => {
  if (!winner || rows.length === 0) return []

  const lowestMae = Math.min(...rows.map((model) => model.mae))
  const highestR2 = Math.max(...rows.map((model) => model.r2))
  const highestScore = Math.max(...rows.map((model) => model.arenaScore))

  const reasons = []

if (winner.mae === lowestMae) {
  reasons.push('Lowest MAE among the evaluated models')
}

if (winner.r2 === highestR2) {
  reasons.push('Highest R² among the evaluated models')
}

if (winner.arenaScore === highestScore) {
  reasons.push('Highest composite meta-score')
}

if (reasons.length === 0) {
  reasons.push('Selected by the backend model-selection process')
}

  return reasons
}, [winner, rows])


  useEffect(() => {
  let active = true

  setLoading(true)
  setError('')
  setPhase('running')

  getMLEvaluation(symbol, period)
    .then((result) => {
      if (active) setData(result)
    })
    .catch((err) => {
      if (active) {
        setError(err.message || 'Unable to run ML evaluation.')
        setData(null)
      }
    })
    .finally(() => {
      if (active) {
        setLoading(false)
        setPhase('done')
      }
    })

  return () => {
    active = false
  }
}, [symbol, period])

 if (loading && !data) {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-full max-w-md" />
      <div className="skeleton h-[300px]" />
      <div className="skeleton h-[260px]" />
    </div>
  )
}

if (error) {
  return (
    <div className="rounded-xl border border-down/25 bg-down/5 p-4 text-sm text-down">
      <p className="font-semibold">ML engine unavailable</p>
      <p className="mt-1 text-slate-400">{error}</p>
      <button
        onClick={() => {
          setData(null)
          setLoading(true)
          setError('')
          getMLEvaluation(symbol, period)
            .then(setData)
            .catch((err) => setError(err.message || 'Unable to run ML evaluation.'))
            .finally(() => setLoading(false))
        }}
        className="mt-3 rounded-lg border border-line px-3 py-2"
      >
        Retry
      </button>
    </div>
  )
}

if (!winner || rows.length === 0) {
  return <p className="text-sm text-slate-400">No model evaluation results available.</p>
}

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-slate-100">Meta-Level Selector</h2>
          <p className="mt-1 text-[12.5px] text-slate-500">The hierarchy decides — base learners compete, the meta-layer selects the strongest predictor per asset.</p>
        </div>
        
<div className="flex items-center gap-1 rounded-lg border border-line bg-ink-900 p-1">
  {['US', 'India'].map((m) => (
    <button
      key={m}
      onClick={() => {
  const nextSymbol =
    m === 'India' ? indianAssets[0]?.symbol : 'NVDA'

  setMarket(m)
  setSymbol(nextSymbol)
  setData(null)
  setError('')
  setLoading(true)

  try {
    localStorage.setItem('harlf.selectedAsset', nextSymbol)
  } catch {
    // localStorage may be unavailable
  }
}}
      className={`rounded-md px-3 py-2 text-xs font-semibold ${
        market === m
          ? 'bg-accent text-ink-950'
          : 'text-slate-400 hover:text-slate-100'
      }`}
    >
      {m}
    </button>
  ))}
</div>

<AssetSelector
  assets={marketAssets}
  value={symbol}
  onChange={setSymbol}
/>

      </div>

      {/* Hierarchy diagram */}
      <div className="bg-grid overflow-hidden rounded-xl border border-line bg-ink-850/80 p-6 shadow-card">
        <div className="flex flex-col items-center">
          <Node label="META LEVEL" tone="border-accent/40 bg-accent/[0.06] px-5 py-2.5 text-[12px] text-accent-soft" active />
          <div className="h-5 w-px bg-gradient-to-b from-accent/60 to-accent/10" />
          <Node label="MODEL SELECTION" tone="border-line text-slate-300" size="px-4 py-2 text-[10.5px]" />
          <div className="h-5 w-px bg-accent/15" />
          <div className="flex items-start gap-3 sm:gap-5">
            {rows.map((m, i) => (
              <div key={m.id} className="flex flex-col items-center">
                <Node label={m.short} tone="border-line" size="px-3 py-1.5 text-[10px]"
                  active={phase === 'done' && m.id === winner.id} />
                <div className="h-4 w-px bg-accent/10" />
                <span className={`num text-[9px] ${phase === 'done' && m.id === winner.id ? 'text-up' : 'text-slate-600'}`}>
                  #{m.rank}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <GitFork className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">Prediction Outputs → Adaptive Allocation</span>
          </div>
        </div>

        {/* Competition */}
        <div className="mt-7 border-t border-line pt-6">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Live Competition · {symbol}</SectionLabel>
            <div className="flex items-center gap-2">
              {phase === 'running' ? (
                <MetricBadge tone="accent"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" /> EVALUATING…</MetricBadge>
              ) : (
                <MetricBadge tone="up"><CheckCircle2 className="h-3 w-3" /> CONVERGED</MetricBadge>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((m, i) => (
              <div key={m.id} className={`rounded-lg border p-4 transition-colors duration-300 ${phase === 'done' && m.id === winner.id ? 'border-up/30 bg-up/[0.05]' : 'border-line bg-ink-900/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="num text-[12px] font-bold" style={{ color: m.color }}>{m.short}</span>
                  <span className="font-mono text-[9px] text-slate-600">RANK #{m.rank}</span>
                </div>
                <div className="mt-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500">Model score</span><span className="num font-semibold text-slate-200">{m.arenaScore.toFixed(1)}</span></div>
                  <Bar value={phase === 'running' ? 8 : m.arenaScore} color={m.color} delay={i * 0.12} />
                  <div className="flex justify-between pt-1.5"><span className="text-slate-500">Prediction</span><span className={`num ${m.prediction >= 0 ? 'text-up' : 'text-down'}`}>{m.prediction >= 0 ? '+' : ''}{m.prediction.toFixed(3)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">MAE</span><span className="num text-slate-300">{m.mae.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Confidence</span><span className="num text-slate-300">{m.confidence}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected model */}
      <AnimatePresence mode="wait">
        {phase === 'done' && (
          <motion.div key={symbol}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-xl border border-up/25 bg-ink-850 p-5 shadow-card">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-up via-up/40 to-transparent" />
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-up/10 blur-3xl" />
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-up" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-up">Selected Model</span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="num text-[26px] font-bold text-slate-100">{winner.name}</span>
                  <span className="num text-[13px] text-slate-500">for {symbol}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-slate-400">
                  <span>SCORE <span className="text-slate-100">{winner.arenaScore}</span></span>
                  <span>PRED <span className={winner.prediction >= 0 ? 'text-up' : 'text-down'}>{winner.prediction >= 0 ? '+' : ''}{winner.prediction.toFixed(3)}%</span></span>
                  <span>R² <span className="text-slate-100">{winner.r2.toFixed(3)}</span></span>
                </div>
              </div>
              <div className="min-w-[240px] rounded-lg border border-line bg-ink-900/60 p-4">
                <div className="mb-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Why selected?</div>
                <ul className="space-y-1.5 text-[12px] text-slate-400">
                 {selectionReasons.map((r) => (
                 <li key={r} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-up" />
                {r}
                </li>
              ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
