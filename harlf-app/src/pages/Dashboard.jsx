import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import ChartCard from '../components/ChartCard.jsx'
import { getMarketIntelligence, getMLEvaluation, getReturnForecast } from '../api/services.js'
import { useSelectedAsset } from '../hooks.jsx'
import { ChartTooltip, axisStyle, gridStroke } from '../components/charts.jsx'
import { Bar as ProgressBar, MetricBadge, SectionLabel, StatusDot } from '../components/ui.jsx'

const PERIOD = '5Y'
const FORECAST_HORIZON = 30

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function formatNumber(value, digits = 2) {
  const number = finite(value)
  return number === null ? '—' : number.toFixed(digits)
}

function formatPercent(value, digits = 2) {
  const number = finite(value)
  return number === null ? '—' : `${number >= 0 ? '+' : ''}${number.toFixed(digits)}%`
}

function formatCurrency(value, currencySymbol = '$') {
  const number = finite(value)
  if (number === null) return '—'
  return `${currencySymbol}${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function shortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function errorText(error) {
  return error?.message || 'Unable to load this dashboard section.'
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'default', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : tone === 'accent' ? 'text-accent' : 'text-slate-600'}`} />
      </div>
      <div className="mt-2 num text-[22px] font-bold text-slate-100">{value}</div>
      {sub && <div className="mt-1 text-[10.5px] text-slate-500">{sub}</div>}
    </motion.div>
  )
}

function EmptyPanel({ title, message, action, onAction }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border border-line bg-ink-850/60 p-6 text-center">
      <Activity className="h-5 w-5 text-slate-600" />
      <div className="mt-3 text-[13px] font-semibold text-slate-300">{title}</div>
      <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">{message}</p>
      {action && (
        <button type="button" onClick={onAction} className="mt-3 rounded-lg border border-line px-3 py-1.5 text-[10.5px] font-semibold text-slate-300 hover:border-accent/40 hover:text-accent-soft">
          {action}
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [symbol] = useSelectedAsset('NVDA')
  const [market, setMarket] = useState(null)
  const [ml, setMl] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [optimization, setOptimization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState({ market: '', ml: '', forecast: '' })

  const loadDashboard = useCallback(async ({ refresh = false } = {}) => {
    setRefreshing(refresh)
    if (!refresh) setLoading(true)
    setErrors({ market: '', ml: '', forecast: '' })

    try {
      const [marketResult, mlResult, forecastResult] = await Promise.allSettled([
        getMarketIntelligence(symbol),
        getMLEvaluation(symbol, PERIOD, refresh),
        getReturnForecast(symbol, FORECAST_HORIZON, PERIOD, 'auto', refresh),
      ])

      if (marketResult.status === 'fulfilled') setMarket(marketResult.value)
      else setErrors((current) => ({ ...current, market: errorText(marketResult.reason) }))

      if (mlResult.status === 'fulfilled') setMl(mlResult.value)
      else setErrors((current) => ({ ...current, ml: errorText(mlResult.reason) }))

      if (forecastResult.status === 'fulfilled') setForecast(forecastResult.value)
      else setErrors((current) => ({ ...current, forecast: errorText(forecastResult.reason) }))
    } finally {
      try {
        const saved = sessionStorage.getItem('harlf_latest_optimization')
        setOptimization(saved ? JSON.parse(saved) : null)
      } catch {
        setOptimization(null)
      }

      setLoading(false)
      setRefreshing(false)
    }
  }, [symbol])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const syncOptimization = () => {
      try {
        const saved = sessionStorage.getItem('harlf_latest_optimization')
        setOptimization(saved ? JSON.parse(saved) : null)
      } catch {
        setOptimization(null)
      }
    }

    window.addEventListener('focus', syncOptimization)
    window.addEventListener('storage', syncOptimization)
    return () => {
      window.removeEventListener('focus', syncOptimization)
      window.removeEventListener('storage', syncOptimization)
    }
  }, [])

  const currency = market?.currencySymbol || forecast?.currencySymbol || (symbol.endsWith('.NS') || symbol.startsWith('^NSE') || symbol === '^BSESN' ? '₹' : '$')
  const winner = ml?.models?.find((item) => item.id === ml?.champion) || ml?.models?.[0]

  const marketHistory = useMemo(() => {
    return (market?.history || []).slice(-90).map((item) => ({
      date: shortDate(item.date),
      price: finite(item.price),
    }))
  }, [market])

  const modelRows = useMemo(() => {
    return (ml?.models || []).map((item) => ({
      model: item.short || item.id?.toUpperCase(),
      score: finite(item.arenaScore) ?? 0,
      r2: finite(item.r2) ?? 0,
      mae: finite(item.mae) ?? 0,
      rank: item.rank,
    }))
  }, [ml])

  const forecastChart = useMemo(() => {
    if (!forecast) return []
    const historical = (forecast.historicalPrices || []).slice(-45).map((item) => ({
      date: shortDate(item.date),
      actual: finite(item.price),
      forecast: null,
      lower: null,
      upper: null,
    }))

    const future = (forecast.forecast || []).map((item) => ({
      date: shortDate(item.date),
      actual: null,
      forecast: finite(item.predictedPrice),
      lower: finite(item.lowerPrice),
      upper: finite(item.upperPrice),
    }))

    return [...historical, ...future]
  }, [forecast])

  const validationChart = useMemo(() => {
    return (forecast?.validationBacktest || []).slice(-45).map((item) => ({
      date: shortDate(item.date),
      actual: finite(item.actualReturnPct),
      predicted: finite(item.predictedReturnPct),
    }))
  }, [forecast])

  const portfolioMetrics = optimization?.metrics
  const equalWeightMetrics = optimization?.equal_weight_metrics
  const weights = optimization?.weights || {}
  const topWeights = Object.entries(weights)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5)

  const dailyChange = finite(market?.dailyChangePercent)
  const forecastReturn = finite(forecast?.expectedReturnPct)
  const r2 = finite(winner?.r2)
  const directional = finite(winner?.directionalAccuracy)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2"><div className="skeleton h-7 w-72" /><div className="skeleton h-4 w-96 max-w-full" /></div>
          <div className="skeleton h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-[112px]" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]"><div className="skeleton h-[390px]" /><div className="skeleton h-[390px]" /></div>
        <div className="grid gap-4 xl:grid-cols-2"><div className="skeleton h-[350px]" /><div className="skeleton h-[350px]" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Central overview header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgba(34,211,238,0.55)]" />
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-accent-soft">Central Overview</span>
          </div>
          <h2 className="mt-1 text-[24px] font-bold tracking-tight text-slate-100">Portfolio Intelligence Dashboard</h2>
          <p className="mt-1 max-w-3xl text-[12.5px] text-slate-500">
            A live summary of the existing market, ML, forecasting and portfolio intelligence for the selected asset.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MetricBadge tone={errors.market ? 'warn' : 'up'}>
            <StatusDot tone={errors.market ? 'warn' : 'up'} />
            {errors.market ? 'MARKET DATA ISSUE' : 'MARKET DATA READY'}
          </MetricBadge>
          <button type="button" onClick={() => loadDashboard({ refresh: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:border-accent/40 hover:text-accent-soft disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh overview
          </button>
        </div>
      </div>

      {/* Selected asset context */}
      <div className="rounded-xl border border-line bg-ink-850/80 px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-slate-600">Selected Market Intelligence Asset</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="num text-[20px] font-bold text-slate-100">{market?.name || forecast?.name || symbol}</span>
              <span className="font-mono text-[11px] text-slate-500">{symbol}</span>
              {ml?.universe && <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[9px] text-slate-500">{ml.universe}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span>ML period <strong className="text-slate-300">{ml?.period || PERIOD}</strong></span>
            <span>Forecast <strong className="text-slate-300">{FORECAST_HORIZON} sessions</strong></span>
            <span>Source <strong className="text-slate-300">{market?.source || ml?.source || '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Live market KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Wallet} label="Current Price" value={formatCurrency(market?.currentPrice ?? ml?.latestPrice, currency)} sub={market?.priceTimestamp ? `As of ${shortDate(market.priceTimestamp)}` : 'Latest available'} delay={0} />
        <KpiCard icon={dailyChange >= 0 ? ArrowUpRight : ArrowDownRight} label="Daily Change" value={formatPercent(dailyChange)} sub={market?.previousClose ? `Prev. close ${formatCurrency(market.previousClose, currency)}` : 'Market Intelligence'} tone={dailyChange >= 0 ? 'up' : 'down'} delay={0.04} />
        <KpiCard icon={Gauge} label="30D Volatility" value={market?.volatility30d != null ? `${formatNumber(market.volatility30d)}%` : '—'} sub="Annualized" delay={0.08} />
        <KpiCard icon={Target} label="RSI (14)" value={formatNumber(market?.rsi14)} sub={market?.rsi14 != null ? (market.rsi14 >= 70 ? 'Overbought zone' : market.rsi14 <= 30 ? 'Oversold zone' : 'Neutral zone') : 'Unavailable'} delay={0.12} />
        <KpiCard icon={BrainCircuit} label="Arena Champion" value={winner?.short || '—'} sub={winner?.name || 'Awaiting evaluation'} tone="accent" delay={0.16} />
        <KpiCard icon={TrendingUp} label="30D Forecast" value={formatPercent(forecastReturn)} sub={forecast?.expectedPrice != null ? `Target ${formatCurrency(forecast.expectedPrice, currency)}` : 'Awaiting forecast'} tone={forecastReturn >= 0 ? 'up' : 'down'} delay={0.2} />
      </div>

      {/* Market chart + ML champion */}
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <ChartCard
          label="Market Intelligence"
          title={`${market?.name || symbol} · 90-session price history`}
          subtitle="Historical market prices from the existing Market Intelligence service."
          controls={
            <MetricBadge tone={dailyChange >= 0 ? 'up' : 'warn'}>
              {dailyChange >= 0 ? 'UP' : 'DOWN'} · {formatPercent(dailyChange)} today
            </MetricBadge>
          }
        >
          {errors.market ? (
            <div className="p-5"><EmptyPanel title="Market data unavailable" message={errors.market} action="Retry" onAction={() => loadDashboard({ refresh: true })} /></div>
          ) : (
            <div className="bg-grid h-[360px] px-1 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketHistory} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="dashboardPriceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={42} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={['dataMin', 'auto']} tickFormatter={(value) => Number(value).toFixed(0)} />
                  <Tooltip content={<ChartTooltip prefix={currency} />} />
                  <Area type="monotone" dataKey="price" name="Price" stroke="#22D3EE" strokeWidth={2} fill="url(#dashboardPriceFill)" dot={false} activeDot={{ r: 3.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><SectionLabel>Model Intelligence</SectionLabel><p className="mt-1 text-[10.5px] text-slate-500">Existing Model Arena evaluation</p></div>
            {winner && <MetricBadge tone="up"><ShieldCheck className="h-3 w-3" /> RANK #{winner.rank}</MetricBadge>}
          </div>
          {errors.ml ? (
            <div className="p-5"><EmptyPanel title="ML evaluation unavailable" message={errors.ml} action="Retry" onAction={() => loadDashboard({ refresh: true })} /></div>
          ) : winner ? (
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Champion</div>
                  <div className="mt-1 text-[25px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-soft to-accent">{winner.short}</div>
                  <div className="text-[12px] text-slate-400">{winner.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">Next-session prediction</div>
                  <div className={`mt-1 num text-[20px] font-bold ${Number(winner.prediction) >= 0 ? 'text-up' : 'text-down'}`}>{formatPercent(winner.prediction, 3)}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">R²</div><div className={`mt-1 num text-[15px] font-semibold ${r2 < 0 ? 'text-amber-400' : 'text-slate-100'}`}>{formatNumber(r2, 4)} {r2 < 0 && <span className="ml-1 text-[8px]">Below baseline</span>}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Directional accuracy</div><div className="mt-1 num text-[15px] font-semibold text-slate-100">{directional == null ? '—' : `${formatNumber(directional, 1)}%`}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">MAE</div><div className="mt-1 num text-[15px] font-semibold text-slate-100">{formatNumber(winner.mae, 4)}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">RMSE</div><div className="mt-1 num text-[15px] font-semibold text-slate-100">{formatNumber(winner.rmse, 4)}</div></div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between"><SectionLabel>Model Arena scores</SectionLabel><span className="font-mono text-[9px] text-slate-600">relative composite</span></div>
                {modelRows.map((row) => (
                  <div key={row.model}>
                    <div className="mb-1 flex items-center justify-between text-[10.5px]"><span className={`font-mono font-semibold ${row.model === winner.short ? 'text-accent-soft' : 'text-slate-400'}`}>{row.model}</span><span className="num text-slate-300">{formatNumber(row.score, 1)}</span></div>
                    <ProgressBar value={Math.max(0, Math.min(100, row.score))} color={row.model === winner.short ? '#22D3EE' : '#475569'} />
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="p-5"><EmptyPanel title="No model results" message="The Model Arena has not returned an evaluation for the selected asset yet." /></div>}
        </section>
      </div>

      {/* Forecast analytics */}
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard
          label="Return Forecast"
          title={`${FORECAST_HORIZON}-session forecast path`}
          subtitle="Existing recursive forecast with the approximate validation-error uncertainty band."
          controls={forecast && <MetricBadge tone={forecastReturn >= 0 ? 'up' : 'warn'}>{forecast.model?.short || forecast.model?.id?.toUpperCase()} · {formatPercent(forecastReturn)}</MetricBadge>}
        >
          {errors.forecast ? (
            <div className="p-5"><EmptyPanel title="Forecast unavailable" message={errors.forecast} action="Retry" onAction={() => loadDashboard({ refresh: true })} /></div>
          ) : (
            <div className="bg-grid h-[365px] px-1 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastChart} margin={{ top: 8, right: 14, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={42} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(value) => Number(value).toFixed(0)} />
                  <Tooltip content={<ChartTooltip prefix={currency} />} />
                  <Line type="monotone" dataKey="actual" name="Historical" stroke="#64748B" strokeWidth={1.5} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#34D399" strokeWidth={2} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="lower" name="Lower range" stroke="#34D399" strokeOpacity={0.35} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="upper" name="Upper range" stroke="#34D399" strokeOpacity={0.35} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
          <div className="border-b border-line px-5 py-4"><SectionLabel>Forecast Summary</SectionLabel></div>
          {forecast ? (
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Current price</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{formatCurrency(forecast.latestPrice, currency)}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Expected price</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{formatCurrency(forecast.expectedPrice, currency)}</div></div>
              </div>
              <div className={`rounded-lg border p-4 ${forecastReturn >= 0 ? 'border-up/25 bg-up/5' : 'border-down/25 bg-down/5'}`}>
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-slate-500">Cumulative forecast return</span><span className={`num text-[18px] font-bold ${forecastReturn >= 0 ? 'text-up' : 'text-down'}`}>{formatPercent(forecastReturn)}</span></div>
                <div className="mt-2 text-[10px] leading-relaxed text-slate-500">{forecast.model?.name || 'Selected model'} · {forecast.model?.selectionMethod || 'Arena selection'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div><span className="text-slate-500">Terminal lower</span><div className="mt-1 num text-slate-200">{formatCurrency(forecast.terminalRange?.lowerPrice, currency)}</div></div>
                <div><span className="text-slate-500">Terminal upper</span><div className="mt-1 num text-slate-200">{formatCurrency(forecast.terminalRange?.upperPrice, currency)}</div></div>
                <div><span className="text-slate-500">Validation R²</span><div className="mt-1 num text-slate-200">{formatNumber(forecast.model?.validationR2, 4)}</div></div>
                <div><span className="text-slate-500">Validation direction</span><div className="mt-1 num text-slate-200">{formatNumber(forecast.model?.directionalAccuracyPct, 1)}%</div></div>
              </div>
              <div className="rounded-lg border border-line bg-ink-900/40 p-3 text-[10px] leading-relaxed text-slate-500">{forecast.uncertainty?.note}</div>
            </div>
          ) : <div className="p-5"><EmptyPanel title="Awaiting forecast" message="Forecast information will appear here when the forecast engine returns successfully." /></div>}
        </section>
      </div>

      {/* Validation + portfolio overview */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <ChartCard label="Validation" title="Actual vs predicted returns" subtitle="Recent chronological validation observations from the existing forecast engine.">
          {validationChart.length ? (
            <div className="bg-grid h-[330px] px-1 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={validationChart} margin={{ top: 8, right: 14, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={42} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Tooltip content={<ChartTooltip suffix="%" />} />
                  <ReferenceLine y={0} stroke="rgba(148,163,184,0.2)" />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#64748B" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#22D3EE" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="p-5"><EmptyPanel title="No validation series" message="The forecast engine did not return enough validation observations for this selected asset." /></div>}
        </ChartCard>

        <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><SectionLabel>Portfolio Overview</SectionLabel><p className="mt-1 text-[10.5px] text-slate-500">Latest saved Optimizer result</p></div>
            {optimization?.universe && <MetricBadge>{optimization.universe}</MetricBadge>}
          </div>
          {optimization && portfolioMetrics ? (
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Expected annual return</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{formatPercent(Number(portfolioMetrics.expected_annual_return) * 100)}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Annualized volatility</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{formatPercent(Number(portfolioMetrics.annualized_volatility) * 100)}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Sharpe ratio</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{formatNumber(portfolioMetrics.sharpe_ratio, 2)}</div></div>
                <div className="rounded-lg border border-line bg-ink-900/60 p-3"><div className="text-[10px] text-slate-500">Holdings</div><div className="mt-1 num text-[17px] font-semibold text-slate-100">{Object.keys(weights).length}</div></div>
              </div>

              {equalWeightMetrics && (
                <div className="mt-4 rounded-lg border border-line bg-ink-900/40 p-3 text-[10.5px] text-slate-500">
                  Equal-weight benchmark Sharpe: <span className="num text-slate-300">{formatNumber(equalWeightMetrics.sharpe_ratio, 2)}</span>
                  <span className="mx-2 text-slate-700">·</span>
                  Optimizer objective: <span className="text-slate-300">{String(optimization.objective || '—').replaceAll('_', ' ')}</span>
                </div>
              )}

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between"><SectionLabel>Top target weights</SectionLabel><span className="font-mono text-[9px] text-slate-600">latest optimization</span></div>
                <div className="space-y-3">
                  {topWeights.map(([asset, weight]) => (
                    <div key={asset}>
                      <div className="mb-1 flex items-center justify-between text-[10.5px]"><span className="font-mono font-semibold text-slate-300">{asset}</span><span className="num text-slate-300">{(Number(weight) * 100).toFixed(1)}%</span></div>
                      <ProgressBar value={Number(weight) * 100} color="#38BDF8" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyPanel title="No saved portfolio result" message="Run Portfolio Optimizer first. The Dashboard will automatically summarize the latest successful optimization without changing the Optimizer or Allocation pages." />
            </div>
          )}
        </section>
      </div>

      {/* Technical snapshot */}
      <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div><SectionLabel>Technical Snapshot</SectionLabel><p className="mt-1 text-[10.5px] text-slate-500">Current indicators already calculated by Market Intelligence</p></div>
          <span className="font-mono text-[9px] text-slate-600">{market?.fetchedAt ? `Fetched ${shortDate(market.fetchedAt)}` : '—'}</span>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: '50D moving average', value: formatCurrency(market?.movingAverage50d, currency), note: market?.currentPrice != null && market?.movingAverage50d != null ? (market.currentPrice >= market.movingAverage50d ? 'Price above average' : 'Price below average') : '—' },
            { label: '30D trend', value: formatPercent(market?.trend30dPercent), note: 'Change over recent 30 sessions' },
            { label: 'Latest volume', value: market?.volume != null ? Number(market.volume).toLocaleString() : '—', note: market?.volumeType || '—' },
            { label: 'Forecast model', value: forecast?.model?.short || winner?.short || '—', note: forecast?.model?.name || winner?.name || '—' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-line bg-ink-900/50 p-4">
              <div className="text-[10px] text-slate-500">{item.label}</div>
              <div className="mt-1 num text-[17px] font-semibold text-slate-100">{item.value}</div>
              <div className="mt-1 text-[9.5px] text-slate-600">{item.note}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
