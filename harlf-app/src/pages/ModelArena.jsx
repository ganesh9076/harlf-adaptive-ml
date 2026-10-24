
import { useEffect, useMemo, useState } from 'react'
import {
  Trophy,
  Info,
  RefreshCw,
  AlertCircle,
  GitCompareArrows,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import AssetSelector from '../components/AssetSelector.jsx'
import { MetricBadge, SectionLabel, StatusDot } from '../components/ui.jsx'
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


const safeNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export default function ModelArena() {
  const [symbol, setSymbol] = useSelectedAsset('NVDA')
  const [market, setMarket] = useState(() => (isIndianSymbol(symbol) ? 'India' : 'US'))
  const [period, setPeriod] = useState('5Y')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [hovered, setHovered] = useState('')

  useEffect(() => {
    setMarket(isIndianSymbol(symbol) ? 'India' : 'US')
  }, [symbol])

  const handleMarketChange = (nextMarket) => {
    setMarket(nextMarket)
    const available = marketAssets[nextMarket]
    if (!available.includes(symbol)) {
      setSymbol(available[0])
    }
  }

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    getMLEvaluation(symbol, period)
      .then((result) => {
        if (!active) return

        setData(result)
        setHovered(result.champion ?? '')
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to run Model Arena.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [symbol, period, refresh])

  const champion = useMemo(
    () => data?.models?.find((model) => model.id === data?.champion),
    [data],
  )

  const chartData = useMemo(
    () =>
      (data?.models ?? []).map((model) => ({
        model: model.short,
        MAE: safeNumber(model.mae),
        RMSE: safeNumber(model.rmse),
        R2: safeNumber(model.r2),
        score: safeNumber(model.arenaScore),
      })),
    [data],
  )

  return (
    <div className="space-y-5">
      {/* Header and controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-accent" />
            <h2 className="text-[20px] font-bold tracking-tight text-slate-100">
              Model Arena
            </h2>
          </div>

          <p className="mt-1 text-[12.5px] text-slate-500">
            Head-to-head comparison using the same stock, dataset, and validation period for the selected market.
          </p>
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

          <AssetSelector
            assets={marketAssets[market]}
            value={symbol}
            onChange={setSymbol}
          />

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-lg border border-line bg-ink-850 px-3 py-2 font-mono text-[11px] text-slate-300 outline-none"
          >
            {periods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh model evaluation"
            className="rounded-lg border border-line bg-ink-850 p-2.5 text-slate-400 hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-down/25 bg-down/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-down" />

          <div>
            <div className="text-sm font-semibold text-down">
              Arena unavailable
            </div>
            <div className="mt-1 text-xs text-slate-500">{error}</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !data ? (
        <div className="space-y-4">
          <div className="skeleton h-[170px]" />

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="skeleton h-[360px] lg:col-span-3" />
            <div className="skeleton h-[360px] lg:col-span-2" />
          </div>
        </div>
      ) : data && champion ? (
        <>
          {/* Champion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl border border-warn/25 bg-gradient-to-r from-warn/[0.07] via-ink-850 to-ink-850 p-5 shadow-card"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-warn/10 blur-3xl" />

            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-warn/30 bg-warn/10">
                  <Trophy className="h-5 w-5 text-warn" />
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[20px] font-bold text-slate-100">
                      #1 {champion.name}
                    </span>
                    <MetricBadge tone="warn">CHAMPION</MetricBadge>
                  </div>

                  <p className="mt-1 max-w-xl text-[11.5px] text-slate-400">
                    Selected automatically from validation results using MAE,
                    RMSE, R², and directional accuracy.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5 sm:flex sm:gap-6">
                {[
                  ['R²', safeNumber(champion.r2).toFixed(3)],
                  ['RMSE', safeNumber(champion.rmse).toFixed(4)],
                  ['Arena score', safeNumber(champion.arenaScore).toFixed(1)],
                ].map(([label, value]) => (
                  <div key={label} className="text-right">
                    <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-slate-500">
                      {label}
                    </div>
                    <div className="num mt-1 text-[15px] font-semibold text-slate-100">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Metrics table and arena score chart */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel>Metric face-off</SectionLabel>
                <MetricBadge tone="accent">
                  <StatusDot tone="accent" /> shared validation
                </MetricBadge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="pb-2 pr-3 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                        Model
                      </th>

                     
                  {['MAE', 'RMSE', 'R²', 'Direction', 'Score'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className={`pb-2 pr-3 text-right font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600 ${
                          heading === 'R²' ? 'w-[1px]' : ''
                        }`}
                      >
                        {heading}
                      </th>
                    ),
                  )}

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {(data.models ?? []).map((model) => (
                      <tr
                        key={model.id}
                        onMouseEnter={() => setHovered(model.id)}
                        className={`${
                          hovered === model.id ? 'bg-white/[0.025]' : ''
                        } transition-colors`}
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: model.color }}
                            />

                            <span className="text-[12px] font-medium text-slate-200">
                              {model.name}
                            </span>

                            {model.id === data.champion && (
                              <MetricBadge tone="warn">#1</MetricBadge>
                            )}
                          </div>
                        </td>

                        <td className="num py-3 pr-3 text-right text-[11px] text-slate-300">
                          {safeNumber(model.mae).toFixed(4)}
                        </td>

                        <td className="num py-3 pr-3 text-right text-[11px] text-slate-300">
                          {safeNumber(model.rmse).toFixed(4)}
                        </td>

                        
                        
                      <td
                        className={`num w-[155px] py-3 pr-3 text-right text-[11px] whitespace-nowrap ${
                          safeNumber(model.r2) < 0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        <span>{safeNumber(model.r2).toFixed(4)}</span>
                        {safeNumber(model.r2) < 0 && (
                          <span className="ml-2 text-[9px]">
                            Below baseline
                          </span>
                        )}
                      </td>



                        <td className="num py-3 pr-3 text-right text-[11px] text-slate-300">
                          {safeNumber(model.directionalAccuracy).toFixed(1)}%
                        </td>

                        <td className="num py-3 text-right text-[11px] font-semibold text-slate-100">
                          {safeNumber(model.arenaScore).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Arena score</SectionLabel>
                <span className="font-mono text-[9px] text-slate-600">
                  higher wins
                </span>
              </div>

              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
                  >
                    <CartesianGrid
                      stroke="rgba(148,163,184,0.08)"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 9 }}
                    />

                    <YAxis
                      type="category"
                      dataKey="model"
                      width={42}
                      tick={{
                        fill: '#94A3B8',
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono',
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: '#0D1524',
                        border: '1px solid rgba(148,163,184,0.12)',
                        borderRadius: 10,
                        fontSize: 11,
                      }}
                    />

                    <Bar
                      dataKey="score"
                      radius={[0, 4, 4, 0]}
                      fill="#22D3EE"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Prediction differences */}
          <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionLabel>Prediction differences</SectionLabel>

              <span className="font-mono text-[9px] text-slate-600">
                next-session return · {symbol}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(data.models ?? []).map((model) => {
                const prediction = safeNumber(model.prediction)
                const validation = safeNumber(
                  model.validationIndicator ?? model.confidence,
                )

                const hasPredictedPrice =
                  model.predictedPrice != null &&
                  Number.isFinite(Number(model.predictedPrice))

                return (
                  <div
                    key={model.id}
                    onMouseEnter={() => setHovered(model.id)}
                    className={`rounded-lg border p-4 transition-colors ${
                      hovered === model.id
                        ? 'border-accent/30 bg-accent/[0.03]'
                        : 'border-line bg-ink-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-300">
                        {model.name}
                      </span>

                      <span className="font-mono text-[9px] text-slate-600">
                        {model.short}
                      </span>
                    </div>

                    {/* Predicted next-session return */}
                    <div
                      className={`num mt-2 text-[18px] font-semibold ${
                        prediction >= 0 ? 'text-up' : 'text-down'
                      }`}
                    >
                      {prediction >= 0 ? '+' : ''}
                      {prediction.toFixed(3)}%
                    </div>

                    {/* Validation indicator */}
                    <div className="mt-2 text-[10px] text-slate-500">
                      Validation indicator: {validation.toFixed(1)}/100
                    </div>

                    {/* Estimated next price */}
                    {hasPredictedPrice && (
                      <div className="mt-2 text-[11px] text-slate-400">
                        Estimated next price: $
                        {Number(model.predictedPrice).toFixed(2)}
                      </div>
                    )}

                    {/* Model ranking */}
                    {model.rank != null && (
                      <div className="mt-2 text-[10px] text-slate-500">
                        Rank: #{model.rank} · Arena Score:{' '}
                        {safeNumber(model.arenaScore).toFixed(1)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Information note */}
          <div className="flex items-start gap-2 rounded-lg border border-line bg-ink-850 px-4 py-3 text-[10.5px] text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />

            <span>
              The Arena compares all available models against the same{' '}
              {symbol} validation window whenever the stock or period changes.
              The validation indicator is a score, not necessarily a calibrated
              probability of a correct prediction.
            </span>
          </div>
        </>
      ) : !loading && !error ? (
        <div className="rounded-xl border border-line bg-ink-850 p-6 text-sm text-slate-400">
          No model evaluation data is available for {symbol}. Try refreshing or
          selecting another stock or period.
        </div>
      ) : null}
    </div>
  )
}
