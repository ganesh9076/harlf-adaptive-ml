import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { BrainCircuit, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react'
import ChartCard from '../components/ChartCard.jsx'
import { ChartTooltip, axisStyle, gridStroke } from '../components/charts.jsx'
import { MetricBadge, SectionLabel, StatusDot } from '../components/ui.jsx'
import { getMarketUniverses, getReturnForecast } from '../api/services.js'
import { useSelectedAsset } from '../hooks.jsx'

const HORIZONS = [7, 30, 90]
const PERIODS = ['2Y', '5Y', '10Y', 'MAX']

const prettyUniverseName = (id) => ({
  us_tech_6: 'US & Global Equities',
  india_large_cap: 'India Large Cap',
  paper_14: 'Market Indices & Commodities',
}[id] || id.replaceAll('_', ' '))

const currency = (value, symbol = '$') => `${symbol}${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`

export default function Forecast() {
  const [symbol, setSymbol] = useSelectedAsset('NVDA')
  const [horizon, setHorizon] = useState(30)
  const [period, setPeriod] = useState('5Y')
  const [modelChoice, setModelChoice] = useState('auto')
  const [universes, setUniverses] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const nextRequestRefresh = useRef(false)

  useEffect(() => {
    let active = true
    getMarketUniverses()
      .then((items) => { if (active) setUniverses(items) })
      .catch(() => { /* Forecast request reports authentication/data errors below. */ })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const forceRefresh = nextRequestRefresh.current
    nextRequestRefresh.current = false
    setLoading(true)
    setError('')

    getReturnForecast(symbol, horizon, period, modelChoice, forceRefresh)
      .then((payload) => {
        if (!active) return
        setResult(payload)
        if (modelChoice !== 'auto' && payload.model.id !== modelChoice) {
          setModelChoice('auto')
        }
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Could not calculate this forecast.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [symbol, horizon, period, modelChoice, refreshToken])

  const chartData = useMemo(() => {
    if (!result) return []
    const actual = result.historicalPrices.map((point) => ({
      date: point.date,
      actualPrice: point.price,
      predictedPrice: null,
      lowerPrice: null,
      bandSpan: null,
    }))
    const projected = result.forecast.map((point) => ({
      date: point.date,
      actualPrice: null,
      predictedPrice: point.predictedPrice,
      lowerPrice: point.lowerPrice,
      bandSpan: point.upperPrice - point.lowerPrice,
    }))
    return [...actual, ...projected]
  }, [result])

  const money = (value) => currency(value, result?.currencySymbol || '$')
  const pct = (value) => `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`

  const handleRefresh = () => {
    nextRequestRefresh.current = true
    setRefreshToken((value) => value + 1)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-slate-100">Return Forecast</h2>
          <p className="mt-1 text-[12.5px] text-slate-500">
            ML-based forward return estimate · historical market data · validation-backed uncertainty
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MetricBadge tone={result ? 'accent' : 'neutral'}>
            <StatusDot tone={result ? 'accent' : 'warn'} />
            {loading ? 'UPDATING MODEL' : result ? result.model.short.toUpperCase() + ' SELECTED' : 'AWAITING DATA'}
          </MetricBadge>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-ink-850/80 p-4 shadow-card md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset</span>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-accent/50">
            {universes.map((universe) => (
              <optgroup key={universe.id} label={prettyUniverseName(universe.id)}>
                {universe.assets.map((asset) => (
                  <option key={asset.ticker} value={asset.ticker}>{asset.ticker} · {asset.name}</option>
                ))}
              </optgroup>
            ))}
            {!universes.length && <option value="NVDA">NVDA</option>}
          </select>
        </label>

        <div>
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Forecast horizon</span>
          <div className="flex h-[42px] items-center gap-1 rounded-lg border border-line bg-ink-900 p-1">
            {HORIZONS.map((days) => (
              <button key={days} type="button" onClick={() => setHorizon(days)} className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[11px] font-semibold transition-colors ${horizon === days ? 'bg-accent/15 text-accent-soft' : 'text-slate-500 hover:text-slate-300'}`}>
                {days} sessions
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Training history</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-accent/50">
            {PERIODS.map((item) => <option key={item} value={item}>{item === 'MAX' ? 'Maximum available history' : item}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Model selection</span>
          <select value={modelChoice} onChange={(event) => setModelChoice(event.target.value)} className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-accent/50">
            <option value="auto">Automatic · Arena winner</option>
            {(result?.availableModels || []).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-down/25 bg-down/[0.06] p-4 text-[12px] text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-down" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100">Forecast could not be loaded</p>
            <p className="mt-1 text-slate-400">{error}</p>
            <button type="button" onClick={handleRefresh} className="mt-2 font-semibold text-accent-soft hover:text-accent">Retry forecast</button>
          </div>
        </div>
      )}

      {loading && !result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-[92px]" />)}</div>
          <div className="skeleton h-[380px]" />
        </div>
      ) : result && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Latest observed price', value: money(result.latestPrice), sub: `Data through ${result.asOf}` },
              { label: `${result.horizon}-session forecast return`, value: pct(result.expectedReturnPct), tone: result.expectedReturnPct >= 0 ? 'text-up' : 'text-down', sub: 'Model estimate, not realized return' },
              { label: 'Forecast terminal price', value: money(result.expectedPrice), sub: `Approx. range ${money(result.terminalRange.lowerPrice)} – ${money(result.terminalRange.upperPrice)}` },
              { label: 'Validation direction hit rate', value: `${result.model.directionalAccuracyPct.toFixed(1)}%`, sub: 'Historical validation only' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card">
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                <div className={`num mt-2 text-[18px] font-semibold ${item.tone || 'text-slate-100'}`}>{item.value}</div>
                <div className="mt-1 text-[10.5px] leading-relaxed text-slate-600">{item.sub}</div>
              </div>
            ))}
          </div>

          <ChartCard
            label="Forward projection"
            title={`${result.symbol} · next ${result.horizon} trading sessions`}
            subtitle={`Solid blue = observed close · dashed green = recursive model path · shaded = approximate 80% error-based range`}
            controls={<MetricBadge tone="accent"><BrainCircuit className="h-3 w-3" /> {result.model.name}</MetricBadge>}
          >
            <div className="h-[360px]">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -4 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={52} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `${result.currencySymbol}${Number(value).toFixed(0)}`} />
                  <Tooltip content={<ChartTooltip prefix={result.currencySymbol} />} />
                  <ReferenceLine x={result.asOf} stroke="rgba(148,163,184,0.45)" strokeDasharray="4 4" label={{ value: 'AS OF', fill: '#64748B', fontSize: 9, fontFamily: 'JetBrains Mono', position: 'insideTopLeft' }} />
                  <Area type="monotone" dataKey="lowerPrice" stackId="range" stroke="none" fill="transparent" name="Range baseline" />
                  <Area type="monotone" dataKey="bandSpan" stackId="range" stroke="none" fill="#22D3EE" fillOpacity={0.12} name="Approx. 80% range" />
                  <Area type="monotone" dataKey="actualPrice" name="Observed close" stroke="#38BDF8" strokeWidth={2} fill="transparent" dot={false} connectNulls={false} />
                  <Area type="monotone" dataKey="predictedPrice" name="Forecast price" stroke="#34D399" strokeWidth={2} strokeDasharray="6 4" fill="transparent" dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <ChartCard label="Historical validation" title="Actual vs. predicted daily return" subtitle={`Out-of-sample validation dates ${result.validation.start} to ${result.validation.end} · latest ${result.validationBacktest.length} validation observations`}>
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <LineChart data={result.validationBacktest} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={48} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(1)}%`} />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="actualReturnPct" name="Actual next-session return" stroke="#38BDF8" strokeWidth={1.8} dot={false} />
                    <Line type="monotone" dataKey="predictedReturnPct" name="Predicted return" stroke="#34D399" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
              <SectionLabel>Model & validation diagnostics</SectionLabel>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink-800 text-accent"><BrainCircuit className="h-5 w-5" /></span>
                <div>
                  <div className="text-[13px] font-semibold text-slate-100">{result.model.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-500">{result.model.version} · {result.model.selectionMethod}</div>
                </div>
              </div>
              <div className="mt-4 divide-y divide-line">
                {[
                  ['Validation MAE', `${result.model.validationMaePct.toFixed(3)}% daily return`],
                  ['Validation RMSE', `${result.model.validationRmsePct.toFixed(3)}% daily return`],
                  ['Validation R²', result.model.validationR2.toFixed(3)],
                  ['Arena rank', result.model.arenaRank ? `#${result.model.arenaRank}` : '—'],
                  ['Daily residual volatility', `${result.uncertainty.dailyResidualStdPct.toFixed(3)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-[11.5px]">
                    <span className="text-slate-500">{label}</span><span className="num text-right font-medium text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-line bg-ink-900/60 p-3 text-[10.5px] leading-relaxed text-slate-500">{result.uncertainty.note}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-warn/20 bg-warn/[0.04] p-4 text-[11.5px] leading-relaxed text-slate-500">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <p><span className="font-semibold text-slate-300">Interpretation note.</span> Forecasts recursively apply one-step model estimates, so errors can compound over longer horizons. The approximate 80% band uses chronological validation residual volatility and is not a calibrated probability interval. Prices are based on cached historical adjusted closes; forecast sessions use weekdays and do not account for exchange holidays. This tool is informational, not investment advice.</p>
          </div>
        </>
      )}
    </div>
  )
}
