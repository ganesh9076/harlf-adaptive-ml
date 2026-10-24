import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Database, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { motion } from 'framer-motion'
import AssetSelector from '../components/AssetSelector.jsx'
import { MetricBadge, SectionLabel, StatusDot, Bar } from '../components/ui.jsx'
import { getMLEvaluation } from '../api/services.js'
import { assetUniverse, indianAssets } from '../data/mock.js'
import { useSelectedAsset } from '../hooks.jsx'

const periods = ['2Y', '5Y', '10Y', 'MAX']

const usAssets = assetUniverse
const indiaSymbols = indianAssets.map((asset) => asset.symbol)
const marketAssets = {
  US: usAssets,
  India: indiaSymbols,
}

const isIndianSymbol = (symbol) => indiaSymbols.includes(symbol)


function pct(value, digits = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`
}

function num(value, digits = 4) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : '—'
}

function ModelCard({ model, index }) {
  const positive = model.prediction >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="group relative overflow-hidden rounded-xl border border-line bg-ink-850/80 p-5 shadow-card"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl" style={{ background: model.color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 font-mono text-[10px] font-bold" style={{ color: model.color }}>
            {model.short}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-100">{model.name}</div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
              <StatusDot tone="up" /> {model.status} · {model.version}
            </div>
          </div>
        </div>
        <MetricBadge tone={model.rank === 1 ? 'up' : 'neutral'}>#{model.rank}</MetricBadge>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-ink-900/60">
        {[['MAE', model.mae], ['RMSE', model.rmse], ['R²', model.r2]].map(([label, value]) => (
          <div key={label} className="px-2 py-2.5 text-center">
            <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">{label}</div>
            <div className="num mt-1 text-[12px] font-semibold text-slate-200">{num(value)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="text-slate-500">Directional accuracy</span>
          <span className="num font-semibold text-slate-200">{model.directionalAccuracy.toFixed(1)}%</span>
        </div>
        <Bar value={model.directionalAccuracy} color={model.color} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">Next-session return</div>
          <div className={`num mt-1 flex items-center gap-1 text-[13px] font-semibold ${positive ? 'text-up' : 'text-down'}`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {pct(model.prediction)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">Confidence</div>
          <div className="num mt-1 text-[13px] font-semibold text-slate-200">{model.confidence.toFixed(1)}%</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MLModels() {
  const [symbol, setSymbol] = useSelectedAsset('NVDA')
  const [market, setMarket] = useState(() => (isIndianSymbol(symbol) ? 'India' : 'US'))
  const [period, setPeriod] = useState('5Y')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setMarket(isIndianSymbol(symbol) ? 'India' : 'US')
  }, [symbol])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getMLEvaluation(symbol, period)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message || 'Unable to run ML evaluation.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [symbol, period, refresh])

  const ranked = useMemo(() => data?.models || [], [data])
  const assetName = data?.name || [...indianAssets.map((x) => ({ symbol: x.symbol, name: x.name })), ...usAssets.map((x) => ({ symbol: x, name: x }))].find((x) => x.symbol === symbol)?.name || symbol
  const assetsForMarket = marketAssets[market]

  const handleMarketChange = (nextMarket) => {
    setMarket(nextMarket)
    const available = marketAssets[nextMarket]
    if (!available.includes(symbol)) {
      setSymbol(available[0])
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-accent" />
            <h2 className="text-[20px] font-bold tracking-tight text-slate-100">ML Model Lab</h2>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500">Base-level models receive the stock selected in Market Intelligence and train on the shared HARLF market dataset for the selected market.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-ink-850 p-1" aria-label="Market">
            {['US', 'India'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleMarketChange(item)}
                className={`rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${market === item ? 'bg-accent text-ink-950' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <AssetSelector assets={assetsForMarket} value={symbol} onChange={setSymbol} />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-line bg-ink-850 px-3 py-2 font-mono text-[11px] text-slate-300 outline-none">
            {periods.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button onClick={() => setRefresh((x) => x + 1)} disabled={loading} className="rounded-lg border border-line bg-ink-850 p-2.5 text-slate-400 hover:text-slate-100 disabled:opacity-50" title="Re-run models">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-4 md:col-span-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent-soft">Market intelligence input</div>
          <div className="mt-1 text-[18px] font-semibold text-slate-100">{symbol} · {assetName}</div>
          <div className="mt-1 text-[11px] text-slate-500">Selection is shared with Market Intelligence.</div>
        </div>
        <div className="rounded-xl border border-line bg-ink-850/80 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Target</div>
          <div className="num mt-2 text-[13px] font-semibold text-slate-200">Next-session return</div>
        </div>
        <div className="rounded-xl border border-line bg-ink-850/80 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Split</div>
          <div className="num mt-2 text-[13px] font-semibold text-slate-200">70 / 15 / 15</div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-down/25 bg-down/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-down" />
          <div><div className="text-sm font-semibold text-down">ML engine unavailable</div><div className="mt-1 text-xs text-slate-500">{error}</div></div>
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[310px]" />)}</div>
      ) : data ? (
        <>
          <div className="flex items-center justify-between">
            <SectionLabel>Four base models</SectionLabel>
            <MetricBadge tone="up"><StatusDot tone="up" /> {data.models.length}/4 TRAINED</MetricBadge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ranked.map((model, index) => <ModelCard key={model.id} model={model} index={index} />)}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel>Training dataset</SectionLabel>
                <MetricBadge tone="accent"><Database className="h-3 w-3" /> {data.source}</MetricBadge>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><div className="font-mono text-[9px] text-slate-600">RANGE</div><div className="num mt-1 text-[12px] text-slate-300">{data.dataset.start} → {data.dataset.end}</div></div>
                <div><div className="font-mono text-[9px] text-slate-600">ROWS</div><div className="num mt-1 text-[12px] text-slate-300">{data.dataset.rows.toLocaleString()}</div></div>
                <div><div className="font-mono text-[9px] text-slate-600">VALIDATION</div><div className="num mt-1 text-[12px] text-slate-300">{data.validation.start} → {data.validation.end}</div></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[['Train', data.dataset.trainRows], ['Validation', data.dataset.validationRows], ['Test', data.dataset.testRows]].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">{label}</div><div className="num mt-1 text-[13px] font-semibold text-slate-200">{value.toLocaleString()}</div></div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
              <SectionLabel>Feature set</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {data.dataset.features.map((feature) => <span key={feature} className="rounded-md border border-line bg-ink-900/70 px-2 py-1 font-mono text-[9px] text-slate-400">{feature}</span>)}
              </div>
              <div className="mt-5 rounded-lg border border-line bg-ink-900/60 p-3 text-[10.5px] leading-5 text-slate-500">
                Models use only information available before the prediction date. The validation window is shared across all four models.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
