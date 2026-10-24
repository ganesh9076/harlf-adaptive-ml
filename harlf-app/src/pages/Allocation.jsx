
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Wallet } from 'lucide-react'
import AllocationChart from '../components/AllocationChart.jsx'
import { useToast } from '../hooks.jsx'
import { Bar, SectionLabel } from '../components/ui.jsx'

const STORAGE_KEY = 'harlf_latest_optimization'
const MAX_WEIGHT = 60

function loadOptimization() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const result = JSON.parse(saved)

    if (
      result?.success !== true ||
      !result.weights ||
      typeof result.weights !== 'object' ||
      Array.isArray(result.weights)
    ) {
      return null
    }

    const entries = Object.entries(result.weights)
    if (
      entries.length < 2 ||
      entries.some(
        ([symbol, weight]) =>
          !symbol.trim() ||
          !Number.isFinite(Number(weight)) ||
          Number(weight) < 0
      )
    ) {
      return null
    }

    // Backend weights are fractions: 0.20 means 20%.
    const weights = Object.fromEntries(
      entries.map(([symbol, weight]) => [
        symbol,
        Number((Number(weight) * 100).toFixed(2)),
      ])
    )

    return { result, weights }
  } catch {
    return null
  }
}

export default function Allocation() {
  const toast = useToast()
  const [saved, setSaved] = useState(loadOptimization)
  const [weights, setWeights] = useState(
    () => loadOptimization()?.weights ?? {}
  )

  useEffect(() => {
    const syncResults = () => {
      const latest = loadOptimization()
      setSaved(latest)
      if (latest) setWeights(latest.weights)
    }

    window.addEventListener('focus', syncResults)
    window.addEventListener('storage', syncResults)

    return () => {
      window.removeEventListener('focus', syncResults)
      window.removeEventListener('storage', syncResults)
    }
  }, [])

  const drift = useMemo(() => {
    if (!saved) return []

    return Object.entries(saved.weights).map(([symbol, target]) => ({
      symbol,
      target,
      current: weights[symbol] ?? target,
      diff: Number(((weights[symbol] ?? target) - target).toFixed(2)),
    }))
  }, [saved, weights])

  const total = Object.values(weights).reduce(
    (sum, weight) => sum + Number(weight || 0),
    0
  )

  function updateWeight(symbol, value) {
    setWeights(current => ({
      ...current,
      [symbol]: Number(value),
    }))
  }

  function rebalance() {
    const latest = loadOptimization()

    if (!latest) {
      toast('Run the optimizer first to generate target weights', 'warn')
      return
    }

    setSaved(latest)
    setWeights(latest.weights)
    toast('Restored optimized target weights', 'up')
  }

  if (!saved) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
        <Wallet size={32} className="text-cyan-400" />
        <h2 className="mt-4 text-lg font-bold text-slate-100">
          No Optimization Results Yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Open Portfolio Optimizer, select your assets, and run a successful
          optimization. Your recommended target allocations will appear here.
        </p>
      </div>
    )
  }

  const outOfBand = drift.filter(d => Math.abs(d.diff) > 2).length

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Allocation</h2>
          <p className="mt-1 text-sm text-slate-400">
            Target weights from your latest optimization ·{' '}
            {saved.result.universe} · {saved.result.period}
          </p>
        </div>

        <button
          type="button"
          onClick={rebalance}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          <RefreshCw size={14} />
          REBALANCE TO TARGET
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="border-b border-slate-800 px-5 py-4">
            <SectionLabel>Weight Composition</SectionLabel>
            <p className="mt-1 text-xs text-slate-400">
              Adjust the sliders to simulate a different allocation.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 p-5 sm:flex-row">
            <AllocationChart
              weights={weights}
              centerLabel="TOTAL"
              centerValue={`${total.toFixed(1)}%`}
            />

            <div className="w-full flex-1 space-y-4">
              {Object.entries(weights).map(([symbol, weight], index) => (
                <div key={symbol}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      {symbol}
                    </span>
                    <span className="text-xs text-slate-100">
                      {weight.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar
                        value={weight}
                        color={[
                          '#22D3EE',
                          '#38BDF8',
                          '#34D399',
                          '#818CF8',
                          '#FBBF24',
                        ][index % 5]}
                      />
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={MAX_WEIGHT}
                      step="0.5"
                      value={Math.min(weight, MAX_WEIGHT)}
                      onChange={event =>
                        updateWeight(symbol, event.target.value)
                      }
                      className="w-24 accent-cyan-400"
                      aria-label={`${symbol} allocation`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
            Adjustments are a simulation. They do not change the saved optimizer
            result or execute trades.
            <p className="mt-1">
              Total allocation: {total.toFixed(2)}%
              {Math.abs(total - 100) > 0.05
                ? ' — allocation does not currently total 100%.'
                : ' — allocation totals approximately 100%.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <SectionLabel>Target Weight Changes</SectionLabel>
              <p className="mt-1 text-xs text-slate-400">
                Differences from the optimizer's recommended weights.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {outOfBand} changed by more than 2%
            </span>
          </div>

          <div className="divide-y divide-slate-800/70">
            {drift.map((item, index) => (
              <motion.div
                key={item.symbol}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <span className="text-xs font-semibold text-slate-200">
                  {item.symbol}
                </span>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">
                    Target {item.target.toFixed(2)}%
                  </span>
                  <span className="text-slate-200">
                    Adjusted {item.current.toFixed(2)}%
                  </span>
                  <span
                    className={`w-16 text-right font-semibold ${
                      Math.abs(item.diff) > 2
                        ? 'text-amber-400'
                        : item.diff > 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {item.diff > 0 ? '+' : ''}
                    {item.diff.toFixed(2)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
            This compares your slider adjustments with the optimizer's target,
            not with real brokerage holdings. Actual portfolio drift requires
            current holdings data.
          </div>
        </div>
      </div>
    </div>
  )
}
