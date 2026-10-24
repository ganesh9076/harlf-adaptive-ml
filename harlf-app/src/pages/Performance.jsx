import { useEffect, useMemo, useState } from 'react'
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
import { AlertTriangle, RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import ChartCard from '../components/ChartCard.jsx'
import { ChartTooltip, axisStyle, gridStroke } from '../components/charts.jsx'
import { MetricBadge, SectionLabel, StatusDot } from '../components/ui.jsx'
import { getHistoricalPrices, getMarketUniverses } from '../api/services.js'

const PERIODS = [
  { id: '1Y', label: '1Y', rows: 252 },
  { id: '3Y', label: '3Y', rows: 756 },
  { id: '5Y', label: '5Y', rows: 1260 },
  { id: '10Y', label: '10Y', rows: 2520 },
  { id: 'MAX', label: 'MAX', rows: Infinity },
]

const DEFAULT_HOLDINGS = {
  us_tech_6: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],
  india_large_cap: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS'],
}
const DEFAULT_BENCHMARK = { us_tech_6: '^GSPC', india_large_cap: '^NSEI' }

function buildPriceMap(payload, symbol) {
  const values = payload?.series?.[symbol]
  if (!payload?.dates?.length || !values || values.length !== payload.dates.length) {
    throw new Error(`Historical prices are unavailable for ${symbol}. Refresh the market data cache and try again.`)
  }
  return new Map(payload.dates.map((date, index) => [date, Number(values[index])]))
}

function metricSet(values) {
  const first = values[0]
  const last = values[values.length - 1]
  const totalReturn = first > 0 ? last / first - 1 : 0
  const intervals = Math.max(values.length - 1, 1)
  const annualizedReturn = first > 0 && last > 0 ? Math.pow(last / first, 252 / intervals) - 1 : 0
  const dailyReturns = values.slice(1).map((value, index) => value / values[index] - 1).filter(Number.isFinite)
  const mean = dailyReturns.length ? dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length : 0
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (dailyReturns.length - 1)
    : 0
  const dailyVolatility = Math.sqrt(Math.max(variance, 0))
  let peak = first
  let maxDrawdown = 0
  const drawdowns = values.map((value) => {
    peak = Math.max(peak, value)
    const drawdown = peak > 0 ? (value / peak - 1) * 100 : 0
    maxDrawdown = Math.min(maxDrawdown, drawdown)
    return drawdown
  })

  return {
    totalReturnPct: totalReturn * 100,
    annualizedReturnPct: annualizedReturn * 100,
    volatilityPct: dailyVolatility * Math.sqrt(252) * 100,
    sharpe: dailyVolatility > 0 ? (mean / dailyVolatility) * Math.sqrt(252) : 0,
    maxDrawdownPct: maxDrawdown,
    drawdowns,
    dailyReturns,
  }
}

function calculatePerformance({ pricePayload, indexPayload, symbols, weights, benchmark, period, investment }) {
  if (!pricePayload || !indexPayload) return null
  if (symbols.length < 2) throw new Error('Select at least two holdings to review portfolio diversification.')

  const investAmount = Number(investment)
  if (!Number.isFinite(investAmount) || investAmount <= 0) throw new Error('Enter an investment amount greater than zero.')

  const priceMaps = Object.fromEntries(symbols.map((symbol) => [symbol, buildPriceMap(pricePayload, symbol)]))
  const benchmarkMap = buildPriceMap(indexPayload, benchmark)
  const dates = pricePayload.dates.filter((date) =>
    benchmarkMap.has(date) && symbols.every((symbol) => {
      const value = priceMaps[symbol].get(date)
      return Number.isFinite(value) && value > 0
    }) && Number.isFinite(benchmarkMap.get(date)) && benchmarkMap.get(date) > 0,
  )

  const periodChoice = PERIODS.find((item) => item.id === period) || PERIODS[2]
  const windowDates = dates.slice(-periodChoice.rows)
  if (windowDates.length < 30) throw new Error('Not enough overlapping daily prices for the selected assets and benchmark.')

  const rawWeightTotal = symbols.reduce((sum, symbol) => sum + Math.max(0, Number(weights[symbol]) || 0), 0)
  const normalizedWeights = Object.fromEntries(symbols.map((symbol) => [
    symbol,
    rawWeightTotal > 0 ? Math.max(0, Number(weights[symbol]) || 0) / rawWeightTotal : 1 / symbols.length,
  ]))

  const portfolioValues = windowDates.map((date, index) => {
    const value = symbols.reduce((sum, symbol) => {
      const initialPrice = priceMaps[symbol].get(windowDates[0])
      const currentPrice = priceMaps[symbol].get(date)
      return sum + investAmount * normalizedWeights[symbol] * (currentPrice / initialPrice)
    }, 0)
    return index === 0 ? investAmount : value
  })
  const benchmarkInitial = benchmarkMap.get(windowDates[0])
  const benchmarkValues = windowDates.map((date) => investAmount * (benchmarkMap.get(date) / benchmarkInitial))
  const portfolioMetrics = metricSet(portfolioValues)
  const benchmarkMetrics = metricSet(benchmarkValues)

  const chart = windowDates.map((date, index) => ({
    date,
    portfolioValue: Number(portfolioValues[index].toFixed(2)),
    benchmarkValue: Number(benchmarkValues[index].toFixed(2)),
    portfolioDrawdown: Number(portfolioMetrics.drawdowns[index].toFixed(3)),
    benchmarkDrawdown: Number(benchmarkMetrics.drawdowns[index].toFixed(3)),
  }))

  const holdings = symbols.map((symbol) => {
    const first = priceMaps[symbol].get(windowDates[0])
    const latest = priceMaps[symbol].get(windowDates[windowDates.length - 1])
    const initialAllocation = investAmount * normalizedWeights[symbol]
    return {
      symbol,
      initialWeightPct: normalizedWeights[symbol] * 100,
      marketValue: initialAllocation * latest / first,
      returnPct: (latest / first - 1) * 100,
    }
  })
  const finalValueTotal = holdings.reduce((sum, item) => sum + item.marketValue, 0)
  holdings.forEach((item) => { item.currentWeightPct = finalValueTotal > 0 ? item.marketValue / finalValueTotal * 100 : 0 })
  const effectiveHoldings = 1 / holdings.reduce((sum, item) => sum + (item.currentWeightPct / 100) ** 2, 0)

  return {
    universe: pricePayload.universe,
    benchmark,
    period,
    startDate: windowDates[0],
    endDate: windowDates[windowDates.length - 1],
    observations: windowDates.length,
    investment: investAmount,
    currencySymbol: pricePayload.universe === 'india_large_cap' ? '₹' : '$',
    finalPortfolioValue: portfolioValues[portfolioValues.length - 1],
    finalBenchmarkValue: benchmarkValues[benchmarkValues.length - 1],
    portfolioMetrics,
    benchmarkMetrics,
    chart,
    holdings,
    effectiveHoldings,
    weightsNormalized: Math.abs(rawWeightTotal - 100) > 0.05,
  }
}

const money = (value, symbol = '$') => `${symbol}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const signedPct = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
const pct = (value) => `${value.toFixed(2)}%`

export default function Performance() {
  const [universe, setUniverse] = useState('us_tech_6')
  const [universes, setUniverses] = useState([])
  const [pricePayload, setPricePayload] = useState(null)
  const [indexPayload, setIndexPayload] = useState(null)
  const [selected, setSelected] = useState(DEFAULT_HOLDINGS.us_tech_6)
  const [weights, setWeights] = useState(Object.fromEntries(DEFAULT_HOLDINGS.us_tech_6.map((symbol) => [symbol, 20])))
  const [benchmark, setBenchmark] = useState(DEFAULT_BENCHMARK.us_tech_6)
  const [period, setPeriod] = useState('5Y')
  const [investment, setInvestment] = useState('10000')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let active = true
    getMarketUniverses()
      .then((items) => { if (active) setUniverses(items) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load asset universes.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getHistoricalPrices(universe),
      getHistoricalPrices('paper_14'),
    ])
      .then(([prices, indices]) => {
        if (!active) return
        setPricePayload(prices)
        setIndexPayload(indices)
      })
      .catch((requestError) => {
        if (!active) return
        setPricePayload(null)
        setIndexPayload(null)
        setError(requestError.message || 'Could not load historical prices.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [universe, refreshTick])

  const universeInfo = universes.find((item) => item.id === universe)
  const availablePortfolioAssets = (universeInfo?.assets || []).filter((item) => pricePayload?.series?.[item.ticker])
  const benchmarkInfo = universes.find((item) => item.id === 'paper_14')
  const benchmarkOptions = (benchmarkInfo?.assets || []).filter((item) =>
    item.ticker.startsWith('^') || item.ticker === '000001.SS',
  )

  const performance = useMemo(() => {
    try {
      return calculatePerformance({ pricePayload, indexPayload, symbols: selected, weights, benchmark, period, investment })
    } catch (calculationError) {
      return { error: calculationError.message || 'Could not calculate portfolio performance.' }
    }
  }, [pricePayload, indexPayload, selected, weights, benchmark, period, investment])

  const resetPortfolioForUniverse = (nextUniverse) => {
    const nextSelected = DEFAULT_HOLDINGS[nextUniverse] || []
    setUniverse(nextUniverse)
    setSelected(nextSelected)
    setWeights(Object.fromEntries(nextSelected.map((symbol) => [symbol, 100 / Math.max(1, nextSelected.length)])))
    setBenchmark(DEFAULT_BENCHMARK[nextUniverse] || '^GSPC')
  }

  const toggleHolding = (symbol) => {
    if (selected.includes(symbol)) {
      if (selected.length <= 2) return
      setSelected((current) => current.filter((item) => item !== symbol))
      return
    }
    setSelected((current) => [...current, symbol])
    setWeights((current) => ({ ...current, [symbol]: 100 / (selected.length + 1) }))
  }

  const setWeight = (symbol, value) => setWeights((current) => ({ ...current, [symbol]: value === '' ? '' : Math.max(0, Math.min(100, Number(value))) }))
  const symbolForCurrency = performance?.currencySymbol || (universe === 'india_large_cap' ? '₹' : '$')
  const validPerformance = performance && !performance.error
  const portfolioOutperforms = validPerformance && performance.portfolioMetrics.totalReturnPct >= performance.benchmarkMetrics.totalReturnPct

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-slate-100">Portfolio Performance</h2>
          <p className="mt-1 text-[12.5px] text-slate-500">Historical close-to-close backtest · customizable long-only holdings · benchmark-relative risk and return</p>
        </div>
        <div className="flex items-center gap-2">
          <MetricBadge tone={validPerformance ? (portfolioOutperforms ? 'up' : 'warn') : 'warn'}>
            <StatusDot tone={validPerformance ? (portfolioOutperforms ? 'up' : 'warn') : 'warn'} />
            {loading ? 'LOADING PRICES' : validPerformance ? `${portfolioOutperforms ? 'HIGHER' : 'LOWER'} TOTAL RETURN` : 'AWAITING DATA'}
          </MetricBadge>
          <button type="button" onClick={() => setRefreshTick((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-[11.5px] font-semibold text-slate-300 hover:border-accent/40 hover:text-accent-soft disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh data
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.05fr_1.55fr]">
        <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
          <div className="border-b border-line px-5 py-4"><SectionLabel>Backtest configuration</SectionLabel></div>
          <div className="space-y-5 p-5">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset market</span>
              <select value={universe} onChange={(event) => resetPortfolioForUniverse(event.target.value)} className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-accent/50">
                <option value="us_tech_6">US & global equities</option>
                <option value="india_large_cap">Indian large-cap equities</option>
              </select>
            </label>

            <div>
              <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Initial investment</div>
              <div className="flex items-center rounded-lg border border-line bg-ink-900 px-3 focus-within:border-accent/50">
                <span className="font-mono text-[12px] text-slate-500">{symbolForCurrency}</span>
                <input aria-label="Initial investment" type="number" min="100" step="100" value={investment} onChange={(event) => setInvestment(event.target.value)} className="w-full bg-transparent px-2 py-2.5 text-[12.5px] text-slate-100 outline-none" />
              </div>
            </div>

            <div>
              <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Evaluation period</div>
              <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-ink-900 p-1">
                {PERIODS.map((item) => (
                  <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={`flex-1 rounded-md px-2 py-1.5 font-mono text-[10.5px] font-semibold ${period === item.id ? 'bg-accent/15 text-accent-soft' : 'text-slate-500 hover:text-slate-300'}`}>{item.label}</button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Benchmark index</span>
              <select value={benchmark} onChange={(event) => setBenchmark(event.target.value)} className="w-full rounded-lg border border-line bg-ink-900 px-3 py-2.5 text-[12px] text-slate-200 outline-none focus:border-accent/50">
                {benchmarkOptions.map((item) => <option key={item.ticker} value={item.ticker}>{item.ticker} · {item.name}</option>)}
              </select>
            </label>

            <div className="rounded-lg border border-line bg-ink-900/60 p-3 text-[10.5px] leading-relaxed text-slate-500">
              <div className="mb-1 flex items-center gap-2 text-slate-300"><SlidersHorizontal className="h-3.5 w-3.5 text-accent" /> Weighting assumption</div>
              Weights are applied to the initial investment and then allowed to drift as prices change (buy-and-hold). Enter any non-negative weights; they are normalized to 100% for the calculation.
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-ink-850/80 shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionLabel>Portfolio holdings</SectionLabel>
            <span className="font-mono text-[10px] text-slate-500">{selected.length} selected</span>
          </div>
          <div className="p-5">
            {universeInfo ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {availablePortfolioAssets.map((asset) => {
                  const active = selected.includes(asset.ticker)
                  return (
                    <button key={asset.ticker} type="button" onClick={() => toggleHolding(asset.ticker)} aria-pressed={active} className={`rounded-lg border px-2 py-2.5 text-left transition-colors ${active ? 'border-accent/35 bg-accent/10 text-accent-soft' : 'border-line bg-ink-900/60 text-slate-500 hover:border-line/80 hover:text-slate-300'}`}>
                      <span className="block truncate font-mono text-[11px] font-semibold">{asset.ticker}</span>
                      <span className="mt-0.5 block truncate text-[9px] opacity-70">{asset.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : <div className="skeleton h-[180px]" />}

            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Initial weights</div>
              <div className="space-y-2">
                {selected.map((symbol) => (
                  <div key={symbol} className="grid grid-cols-[minmax(0,1fr)_94px] items-center gap-3">
                    <span className="truncate font-mono text-[11.5px] font-medium text-slate-300">{symbol}</span>
                    <div className="flex items-center gap-1 rounded-md border border-line bg-ink-900 px-2">
                      <input aria-label={`${symbol} initial weight percent`} type="number" min="0" max="100" step="0.5" value={weights[symbol] ?? 0} onChange={(event) => setWeight(symbol, event.target.value)} className="w-full bg-transparent py-1.5 text-right font-mono text-[11px] text-slate-100 outline-none" />
                      <span className="font-mono text-[10px] text-slate-600">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {selected.length < 2 && <p className="mt-2 text-[10.5px] text-warn">Select at least two holdings.</p>}
            </div>
          </div>
        </section>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-down/25 bg-down/[0.06] p-4 text-[12px] text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-down" /><div><p className="font-semibold text-slate-100">Historical data unavailable</p><p className="mt-1 text-slate-400">{error}</p></div>
        </div>
      )}
      {performance?.error && !error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-warn/25 bg-warn/[0.05] p-4 text-[12px] text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /><div><p className="font-semibold text-slate-100">Cannot calculate this configuration</p><p className="mt-1 text-slate-400">{performance.error}</p></div>
        </div>
      )}

      {loading && !validPerformance ? (
        <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-[92px]" />)}</div><div className="skeleton h-[340px]" /></div>
      ) : validPerformance && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Portfolio total return', value: signedPct(performance.portfolioMetrics.totalReturnPct), sub: `Ending value ${money(performance.finalPortfolioValue, symbolForCurrency)}`, tone: performance.portfolioMetrics.totalReturnPct >= 0 ? 'text-up' : 'text-down' },
              { label: 'Annualized volatility', value: pct(performance.portfolioMetrics.volatilityPct), sub: 'Daily standard deviation × √252' },
              { label: 'Maximum drawdown', value: pct(performance.portfolioMetrics.maxDrawdownPct), sub: 'Largest peak-to-trough decline', tone: 'text-down' },
              { label: 'Sharpe ratio', value: performance.portfolioMetrics.sharpe.toFixed(2), sub: 'Annualized · risk-free rate assumed 0%' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card">
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                <div className={`num mt-2 text-[18px] font-semibold ${item.tone || 'text-slate-100'}`}>{item.value}</div>
                <div className="mt-1 text-[10.5px] leading-relaxed text-slate-600">{item.sub}</div>
              </div>
            ))}
          </div>

          <ChartCard label="Historical backtest" title="Portfolio value vs. benchmark" subtitle={`${performance.startDate} – ${performance.endDate} · ${performance.observations.toLocaleString()} matched sessions · start value ${money(performance.investment, symbolForCurrency)}`}>
            <div className="h-[340px]">
              <ResponsiveContainer>
                <AreaChart data={performance.chart} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34D399" stopOpacity={0.16} /><stop offset="100%" stopColor="#34D399" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={56} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `${symbolForCurrency}${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip prefix={symbolForCurrency} />} />
                  <Area type="monotone" dataKey="portfolioValue" name="Portfolio" stroke="#34D399" strokeWidth={2} fill="url(#portfolioValueFill)" dot={false} />
                  <Area type="monotone" dataKey="benchmarkValue" name={benchmark} stroke="#64748B" strokeWidth={1.6} fill="transparent" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard label="Risk" title="Drawdown profile" subtitle="Decline from the previous running high; zero marks a new high">
              <div className="h-[270px]">
                <ResponsiveContainer>
                  <LineChart data={performance.chart} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={50} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(0)}%`} />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="portfolioDrawdown" name="Portfolio drawdown" stroke="#F87171" strokeWidth={1.8} dot={false} />
                    <Line type="monotone" dataKey="benchmarkDrawdown" name={`${benchmark} drawdown`} stroke="#64748B" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <div className="overflow-hidden rounded-xl border border-line bg-ink-850/80 shadow-card">
              <div className="border-b border-line px-5 py-4"><SectionLabel>Risk & return comparison</SectionLabel></div>
              <table className="w-full">
                <thead><tr className="border-b border-line bg-ink-900/60 text-left">
                  <th className="px-4 py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Metric</th>
                  <th className="px-3 py-3 text-right font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-accent-soft">Portfolio</th>
                  <th className="px-4 py-3 text-right font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Benchmark</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {[
                    ['Total return', signedPct(performance.portfolioMetrics.totalReturnPct), signedPct(performance.benchmarkMetrics.totalReturnPct)],
                    ['Annualized return (CAGR)', pct(performance.portfolioMetrics.annualizedReturnPct), pct(performance.benchmarkMetrics.annualizedReturnPct)],
                    ['Annualized volatility', pct(performance.portfolioMetrics.volatilityPct), pct(performance.benchmarkMetrics.volatilityPct)],
                    ['Sharpe ratio', performance.portfolioMetrics.sharpe.toFixed(2), performance.benchmarkMetrics.sharpe.toFixed(2)],
                    ['Maximum drawdown', pct(performance.portfolioMetrics.maxDrawdownPct), pct(performance.benchmarkMetrics.maxDrawdownPct)],
                    ['Ending value', money(performance.finalPortfolioValue, symbolForCurrency), money(performance.finalBenchmarkValue, symbolForCurrency)],
                  ].map(([label, portfolioValue, benchmarkValue]) => (
                    <tr key={label} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-[11.5px] text-slate-400">{label}</td>
                      <td className="num px-3 py-3 text-right text-[11.5px] font-semibold text-slate-200">{portfolioValue}</td>
                      <td className="num px-4 py-3 text-right text-[11.5px] text-slate-500">{benchmarkValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-xl border border-line bg-ink-850/80 shadow-card">
              <div className="border-b border-line px-5 py-4"><SectionLabel>Holding-level contribution</SectionLabel></div>
              <table className="w-full">
                <thead><tr className="border-b border-line bg-ink-900/60 text-left">
                  <th className="px-5 py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Asset</th>
                  <th className="px-3 py-3 text-right font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Initial wt.</th>
                  <th className="px-3 py-3 text-right font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Current wt.</th>
                  <th className="px-5 py-3 text-right font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Holding return</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {performance.holdings.map((holding) => (
                    <tr key={holding.symbol} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-mono text-[11.5px] font-semibold text-slate-300">{holding.symbol}</td>
                      <td className="num px-3 py-3 text-right text-[11.5px] text-slate-500">{holding.initialWeightPct.toFixed(1)}%</td>
                      <td className="num px-3 py-3 text-right text-[11.5px] text-slate-500">{holding.currentWeightPct.toFixed(1)}%</td>
                      <td className={`num px-5 py-3 text-right text-[11.5px] font-semibold ${holding.returnPct >= 0 ? 'text-up' : 'text-down'}`}>{signedPct(holding.returnPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-line px-5 py-3 text-[10.5px] text-slate-600">Current holding values reflect price drift from the initial weights; no periodic rebalancing is assumed.</div>
            </div>

            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <div className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Backtest summary</div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                {portfolioOutperforms
                  ? `The selected portfolio returned ${signedPct(performance.portfolioMetrics.totalReturnPct)} over this period, compared with ${signedPct(performance.benchmarkMetrics.totalReturnPct)} for ${benchmark}.`
                  : `The selected portfolio returned ${signedPct(performance.portfolioMetrics.totalReturnPct)} over this period, compared with ${signedPct(performance.benchmarkMetrics.totalReturnPct)} for ${benchmark}.`}
              </p>
              <div className="mt-4 space-y-2 border-t border-line pt-4 text-[11px] text-slate-500">
                <div className="flex justify-between gap-2"><span>Effective number of holdings</span><span className="num text-slate-300">{performance.effectiveHoldings.toFixed(2)}</span></div>
                <div className="flex justify-between gap-2"><span>Matched daily observations</span><span className="num text-slate-300">{performance.observations.toLocaleString()}</span></div>
                <div className="flex justify-between gap-2"><span>Matched data range</span><span className="num text-right text-slate-300">{performance.startDate} – {performance.endDate}</span></div>
                {performance.weightsNormalized && <div className="rounded-md border border-warn/20 bg-warn/[0.04] p-2 text-warn">Entered weights were normalized to 100% for this calculation.</div>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-ink-900/50 p-4 text-[10.5px] leading-relaxed text-slate-500">
            Methodology: portfolio values are calculated from cached historical adjusted closing prices using the chosen starting weights and buy-and-hold quantities. CAGR uses 252 trading sessions per year; volatility and Sharpe use daily returns annualized by √252, with a 0% risk-free rate. Drawdown is measured from the running portfolio peak. The historical calculation excludes trading fees, taxes, slippage and any strategy changes made during the period; it is not a promise of future performance.
          </div>
        </>
      )}
    </div>
  )
}
