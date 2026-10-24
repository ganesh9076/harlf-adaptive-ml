
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import AllocationChart from "../components/AllocationChart";
import { runOptimization } from "../api/services.js";

const MARKETS = {
  us_tech_6: {
    label: "US Stocks",
    assets: [
      "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META",
      "TSLA", "AVGO", "AMD", "INTC", "NFLX", "ORCL",
      "CRM", "IBM", "JPM", "V", "MA", "WMT", "COST",
      "KO", "DIS", "UBER", "PLTR",
    ],
  },
  india_large_cap: {
    label: "Indian Large-Cap Stocks",
    assets: [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS",
      "ICICIBANK.NS", "INFY.NS", "SBIN.NS",
      "BHARTIARTL.NS", "ITC.NS", "LT.NS", "M&M.NS",
      "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS",
      "HINDUNILVR.NS", "TATAMOTORS.NS", "AXISBANK.NS",
      "KOTAKBANK.NS", "WIPRO.NS", "HCLTECH.NS",
      "TATASTEEL.NS", "NTPC.NS", "POWERGRID.NS",
      "ULTRACEMCO.NS", "NESTLEIND.NS", "ASIANPAINT.NS",
    ],
  },
  paper_14: {
    label: "Global Indices & Commodities",
    assets: [
      "^GSPC", "^IXIC", "^DJI", "^FCHI", "^FTSE",
      "^STOXX50E", "^HSI", "000001.SS", "^BSESN",
      "^NSEI", "^NSEBANK", "^KS11", "GC=F", "SI=F", "CL=F",
    ],
  },
};

const PERIODS = ["2Y", "5Y", "10Y", "MAX"];

const OBJECTIVES = [
  {
    value: "max_sharpe",
    label: "Maximum Sharpe Ratio",
    description: "Balance estimated return against volatility.",
  },
  {
    value: "min_risk",
    label: "Minimum Risk",
    description: "Minimize estimated portfolio variance.",
  },
  {
    value: "max_return",
    label: "Maximum Return",
    description: "Maximize estimated historical annualized return.",
  },
];

const RISKS = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Minimize risk.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Use the selected objective.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Maximize estimated return.",
  },
];

const formatPercent = (value) => {
  if (!Number.isFinite(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(2)}%`;
};

const formatNumber = (value, digits = 3) => {
  if (!Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(digits);
};

const formatDate = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function Optimizer() {
  const [market, setMarket] = useState("us_tech_6");
  const [selectedAssets, setSelectedAssets] = useState([
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
  ]);
  const [period, setPeriod] = useState("5Y");
  const [objective, setObjective] = useState("max_sharpe");
  const [riskPreference, setRiskPreference] = useState("balanced");
  const [maxWeightPercent, setMaxWeightPercent] = useState(60);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const availableAssets = MARKETS[market].assets;

  const maximumAssetsRequired = Math.ceil(100 / maxWeightPercent);

  const canOptimize =
    selectedAssets.length >= 2 &&
    selectedAssets.length * (maxWeightPercent / 100) >= 1 - 1e-9 &&
    !loading;

  const objectiveLabel = useMemo(
    () =>
      OBJECTIVES.find((item) => item.value === objective)?.label ??
      objective,
    [objective]
  );

  function changeMarket(nextMarket) {
    setMarket(nextMarket);
    setSelectedAssets(MARKETS[nextMarket].assets.slice(0, 5));
    setResult(null);
    setError("");
  }

  function toggleAsset(symbol) {
    setSelectedAssets((current) => {
      if (current.includes(symbol)) {
        return current.filter((asset) => asset !== symbol);
      }

      if (current.length >= 20) {
        setError("You can select a maximum of 20 assets.");
        return current;
      }

      setError("");
      return [...current, symbol];
    });

    setResult(null);
  }

  function selectAllAssets() {
    setSelectedAssets(availableAssets.slice(0, 20));
    setResult(null);
    setError("");
  }

  function clearAssets() {
    setSelectedAssets([]);
    setResult(null);
    setError("");
  }

  async function handleOptimize(event) {
    event?.preventDefault();

    setError("");
    setResult(null);

    if (selectedAssets.length < 2) {
      setError("Select at least two assets.");
      return;
    }

    if (
      selectedAssets.length * (maxWeightPercent / 100) <
      1 - 1e-9
    ) {
      setError(
        `A ${maxWeightPercent}% maximum weight requires at least ` +
          `${maximumAssetsRequired} selected assets.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        assets: selectedAssets,
        objective,
        risk_preference: riskPreference,
        period,
        universe: market,
        max_weight: maxWeightPercent / 100,
      };

      const response = await runOptimization(payload);

      if (!response || response.success !== true) {
        throw new Error(
          response?.detail || "The optimizer returned an invalid response."
        );
      }

      if (
        !response.weights ||
        typeof response.weights !== "object" ||
        !response.metrics
      ) {
        throw new Error("The backend response is missing weights or metrics.");
      }

      setResult(response);
      

        try {
          sessionStorage.setItem(
            "harlf_latest_optimization",
            JSON.stringify(response)
          );
        } catch (storageError) {
          console.error("Could not save optimization result:", storageError);
        }
    } catch (err) {
      setError(
        err?.message ||
          "Portfolio optimization failed. Check the backend and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Backend weights are decimals: 0.20 means 20%.
  const allocationWeights = useMemo(() => {
    if (!result?.weights) return {};

    return Object.fromEntries(
      Object.entries(result.weights).map(([symbol, weight]) => [
        symbol,
        Number(weight) * 100,
      ])
    );
  }, [result]);

  const metrics = result?.metrics;
  const benchmark = result?.equal_weight_metrics;

  return (
    <div className="space-y-6 pb-8 text-slate-100">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-cyan-400">
            <Activity size={16} />
            HARLF / Portfolio Intelligence
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Portfolio Optimizer
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Allocate capital across selected assets using historical
            returns, covariance, and constrained portfolio optimization.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 sm:self-center">
          <ShieldCheck size={16} className="text-emerald-400" />
          Long-only optimization
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose the market and optimization constraints.
              </p>
            </div>
            <BarChart3 size={21} className="text-cyan-400" />
          </div>

          {/* Market universe */}
          <div>
            <label
              htmlFor="optimizer-market"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Market universe
            </label>

            <select
              id="optimizer-market"
              value={market}
              onChange={(event) => changeMarket(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-500"
            >
              {Object.entries(MARKETS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <label
              htmlFor="optimizer-period"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Historical period
            </label>

            <select
              id="optimizer-period"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setResult(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-500"
            >
              {PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item === "MAX" ? "Maximum available history" : item}
                </option>
              ))}
            </select>
          </div>

          {/* Asset selection */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Assets
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Select 2–20 assets from this universe.
                </p>
              </div>

              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={selectAllAssets}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Select first 20
                </button>
                <button
                  type="button"
                  onClick={clearAssets}
                  className="text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:grid-cols-3">
              {availableAssets.map((symbol) => {
                const checked = selectedAssets.includes(symbol);

                return (
                  <label
                    key={symbol}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-xs transition ${
                      checked
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                        : "border-transparent text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAsset(symbol)}
                      className="accent-cyan-400"
                    />
                    <span className="break-all">{symbol}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{selectedAssets.length} selected</span>
              <span>
                {selectedAssets.length * (maxWeightPercent / 100) >= 1 - 1e-9
                  ? "Weight constraint satisfied"
                  : `Select at least ${maximumAssetsRequired} assets`}
              </span>
            </div>
          </div>

          {/* Objective */}
          <div>
            <label
              htmlFor="optimizer-objective"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Optimization objective
            </label>

            <select
              id="optimizer-objective"
              value={objective}
              onChange={(event) => {
                setObjective(event.target.value);
                setResult(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-500"
            >
              {OBJECTIVES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              {OBJECTIVES.find((item) => item.value === objective)?.description}
            </p>
          </div>

          {/* Risk preference */}
          <div>
            <label
              htmlFor="optimizer-risk"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Risk preference
            </label>

            <select
              id="optimizer-risk"
              value={riskPreference}
              onChange={(event) => {
                setRiskPreference(event.target.value);
                setResult(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-500"
            >
              {RISKS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              {RISKS.find((item) => item.value === riskPreference)?.description}
            </p>
          </div>

          {/* Maximum asset weight */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="optimizer-max-weight"
                className="text-sm font-medium text-slate-300"
              >
                Maximum weight per asset
              </label>

              <span className="font-semibold text-cyan-300">
                {maxWeightPercent}%
              </span>
            </div>

            <input
              id="optimizer-max-weight"
              type="range"
              min="5"
              max="100"
              step="5"
              value={maxWeightPercent}
              onChange={(event) => {
                setMaxWeightPercent(Number(event.target.value));
                setResult(null);
              }}
              className="w-full accent-cyan-400"
            />

            <div className="flex justify-between text-xs text-slate-500">
              <span>5%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            disabled={!canOptimize}
            onClick={handleOptimize}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Optimizing portfolio...
              </>
            ) : (
              <>
                <TrendingUp size={18} />
                Optimize Portfolio
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-xs leading-relaxed text-slate-500">
            Optimization uses historical price data and estimated annualized
            returns and covariance. It does not guarantee future performance.
          </p>
        </motion.section>

        {/* Results */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 space-y-5"
        >
          {!result && !loading && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
              <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <Wallet size={30} className="text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold">Allocation workspace</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                Select your assets and constraints, then run the optimizer
                to view portfolio allocations and compare them with an
                equal-weight portfolio.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
              <RefreshCw size={30} className="animate-spin text-cyan-400" />
              <h2 className="mt-4 font-semibold">Calculating allocations</h2>
              <p className="mt-2 text-sm text-slate-400">
                Loading historical prices and solving the constrained
                optimization problem.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Result heading */}
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                    <CheckCircle2 size={17} />
                    Optimization completed
                  </div>
                  <h2 className="mt-2 text-xl font-bold">
                    Recommended allocation
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {MARKETS[result.universe]?.label || result.universe}
                    {" · "}
                    {result.period}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOptimize}
                  className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                  title="Run optimization again"
                >
                  <RefreshCw size={17} />
                </button>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard
                  title="Expected annual return"
                  value={formatPercent(
                    metrics?.expected_annual_return
                  )}
                  subtitle="Historical estimate"
                />

                <MetricCard
                  title="Annualized volatility"
                  value={formatPercent(
                    metrics?.annualized_volatility
                  )}
                  subtitle="Estimated annual risk"
                />

                <MetricCard
                  title="Sharpe ratio"
                  value={formatNumber(metrics?.sharpe_ratio, 3)}
                  subtitle="Risk-adjusted return"
                />
              </div>

              {/* Allocation chart */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="font-semibold">Portfolio allocation</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Percent of total portfolio assigned to each asset.
                  </p>
                </div>

                {Object.keys(allocationWeights).length > 0 ? (
                  <AllocationChart weights={allocationWeights} />
                ) : (
                  <p className="text-sm text-slate-400">
                    No allocation weights were returned.
                  </p>
                )}
              </div>

              {/* Weights table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="border-b border-slate-800 p-4">
                  <h3 className="font-semibold">Asset allocation details</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Optimized weights returned by the backend.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/70 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Asset</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Weight
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Allocation
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(result.weights)
                        .sort((a, b) => Number(b[1]) - Number(a[1]))
                        .map(([symbol, weight]) => (
                          <tr
                            key={symbol}
                            className="border-t border-slate-800/70"
                          >
                            <td className="px-4 py-3 font-medium">
                              {symbol}
                            </td>
                            <td className="px-4 py-3 text-right text-cyan-300">
                              {(Number(weight) * 100).toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {(Number(weight) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Benchmark */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
                <h3 className="font-semibold">Equal-weight benchmark</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Comparison with equal allocation across the same selected assets.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <BenchmarkValue
                    label="Annual return"
                    value={formatPercent(
                      benchmark?.expected_annual_return
                    )}
                  />
                  <BenchmarkValue
                    label="Annual volatility"
                    value={formatPercent(
                      benchmark?.annualized_volatility
                    )}
                  />
                  <BenchmarkValue
                    label="Sharpe ratio"
                    value={formatNumber(benchmark?.sharpe_ratio, 3)}
                  />
                </div>
              </div>

              {/* Run details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="font-semibold">Optimization details</h3>

                <div className="mt-3 space-y-3 text-sm">
                  <DetailRow
                    label="Requested objective"
                    value={objectiveLabel}
                  />
                  <DetailRow
                    label="Effective objective"
                    value={result.effective_objective}
                  />
                  <DetailRow
                    label="Risk preference"
                    value={result.risk_preference}
                  />
                  <DetailRow
                    label="Selected assets"
                    value={String(result.assets?.length ?? 0)}
                  />
                  <DetailRow
                    label="Historical observations"
                    value={String(result.observations ?? 0)}
                  />
                  <DetailRow
                    label="Data start"
                    value={formatDate(result.start_date)}
                  />
                  <DetailRow
                    label="Data end"
                    value={formatDate(result.end_date)}
                  />
                  <DetailRow
                    label="Maximum weight"
                    value={formatPercent(result.constraints?.max_weight)}
                  />
                  <DetailRow
                    label="Weight total"
                    value={formatPercent(result.constraints?.weights_sum)}
                  />
                  <DetailRow
                    label="Method"
                    value={result.method || "SLSQP"}
                  />
                </div>

                {result.note && (
                  <p className="mt-4 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
                    {result.note}
                  </p>
                )}
              </div>
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function BenchmarkValue({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[60%] break-words text-right text-slate-200">
        {value}
      </span>
    </div>
  );
}
