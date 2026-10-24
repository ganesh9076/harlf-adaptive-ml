
import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  RefreshCw,
  AlertCircle,
  Search,
} from 'lucide-react'

import ChartCard from '../components/ChartCard.jsx'
import { getMarketIntelligence } from '../api/services.js'
import { assetUniverse } from '../data/mock.js'
import {
  ChartTooltip,
  axisStyle,
  gridStroke,
} from '../components/charts.jsx'
import { MetricBadge, StatusDot } from '../components/ui.jsx'
import { useSelectedAsset } from '../hooks.jsx'

const indianAssets = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'BSE SENSEX' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'ITC.NS', name: 'ITC' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'TITAN.NS', name: 'Titan Company' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid' },
  { symbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'ONGC.NS', name: 'ONGC' },
]

const usAssets = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'IBM', name: 'IBM' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale' },
  { symbol: 'KO', name: 'Coca-Cola Company' },
  { symbol: 'DIS', name: 'Walt Disney Company' },
  { symbol: 'UBER', name: 'Uber Technologies' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
]

const isIndianSymbol = (symbol) =>
  Boolean(
    symbol?.endsWith('.NS') ||
    ['^NSEI', '^BSESN', '^NSEBANK'].includes(symbol),
  )

function formatPrice(value, symbol = 'AAPL') {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—'
  }

  const indian = isIndianSymbol(symbol)

  return new Intl.NumberFormat(indian ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: indian ? 'INR' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—'
  }

  const number = Number(value)
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`
}

function Indicator({
  label,
  value,
  sub,
  tone = 'text-slate-100',
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className={`num mt-2 text-[18px] font-semibold ${tone}`}>
        {value}
      </div>

      <div className="mt-1 text-[10.5px] text-slate-600">
        {sub}
      </div>
    </div>
  )
}

export default function MarketData() {
  const [symbol, setSymbol] = useSelectedAsset('NVDA')
  const [market, setMarket] = useState(
    isIndianSymbol(symbol) ? 'India' : 'US',
  )
  const [search, setSearch] = useState('')
  const [marketData, setMarketData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Keep the market selector synchronized with the shared asset selection.
  useEffect(() => {
    setMarket(isIndianSymbol(symbol) ? 'India' : 'US')
  }, [symbol])

 
const availableAssets =
  market === 'India' ? indianAssets : usAssets

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()

    return availableAssets.filter((asset) => {
      const symbolText = String(asset?.symbol ?? '').toLowerCase()
      const nameText = String(asset?.name ?? '').toLowerCase()

      return (
        symbolText.includes(query) ||
        nameText.includes(query)
      )
    })
  }, [availableAssets, search])
  

  // Keep the selected option visible while searching.
  const displayedAssets = useMemo(() => {
    const selected = availableAssets.find(
      (asset) => asset.symbol === symbol,
    )

    if (
      selected &&
      !filteredAssets.some((asset) => asset.symbol === symbol)
    ) {
      return [selected, ...filteredAssets]
    }

    return filteredAssets
  }, [availableAssets, filteredAssets, symbol])

  useEffect(() => {
    let active = true

    async function loadMarketData() {
      setError('')

      if (marketData) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await getMarketIntelligence(symbol)

        if (active) {
          setMarketData(result)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load market data.')
        }
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    loadMarketData()

    return () => {
      active = false
    }
  }, [symbol, reloadKey])

  const history = useMemo(() => {
    if (!Array.isArray(marketData?.history)) return []

    return marketData.history
      .filter((point) => Number.isFinite(Number(point.price)))
      .map((point, index) => ({
        i: index,
        date: point.date,
        price: Number(point.price),
      }))
  }, [marketData])

 
const selectedAsset = [...usAssets, ...indianAssets].find(
  (item) => item.symbol === symbol
)

  const assetName =
    marketData?.name ||
    selectedAsset?.name ||
    symbol

  const dailyChange = Number(marketData?.dailyChangePercent)
  const hasDailyChange = Number.isFinite(dailyChange)

  const changeTone = !hasDailyChange
    ? 'text-slate-100'
    : dailyChange >= 0
      ? 'text-up'
      : 'text-down'

  const rsi = marketData?.rsi14
  const volatility = marketData?.volatility30d
  const movingAverage = marketData?.movingAverage50d
  const trend = marketData?.trend30dPercent
  const volume = marketData?.volume

  const volumeDisplay =
    volume !== null &&
    volume !== undefined &&
    Number.isFinite(Number(volume))
      ? `${(Number(volume) / 1e6).toFixed(2)}M`
      : '—'

  const rsiTone =
    rsi == null
      ? 'text-slate-100'
      : Number(rsi) >= 70
        ? 'text-down'
        : Number(rsi) <= 30
          ? 'text-up'
          : 'text-warn'

  const riskLabel =
    volatility == null
      ? 'Unavailable'
      : Number(volatility) >= 40
        ? 'High'
        : Number(volatility) >= 25
          ? 'Moderate'
          : 'Lower'

  const riskTone =
    riskLabel === 'High'
      ? 'down'
      : riskLabel === 'Moderate'
        ? 'warn'
        : riskLabel === 'Lower'
          ? 'up'
          : 'accent'

  const currencyPrefix = isIndianSymbol(symbol) ? '₹' : '$'

  function changeMarket(nextMarket) {
    setMarket(nextMarket)
    setSearch('')

    if (nextMarket === 'India') {
      setSymbol('^NSEI')
    } else {
      setSymbol('NVDA')
    }
  }

  if (loading && !marketData) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full max-w-3xl" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-[92px]" />
          ))}
        </div>

        <div className="skeleton h-[360px]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page heading and market controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-slate-100">
            Market Intelligence
          </h2>

          <p className="mt-1 text-[12.5px] text-slate-500">
            Market analytics ·{' '}
            {market === 'India'
              ? 'Indian Market · NSE/BSE'
              : 'US Market · NYSE/NASDAQ'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Market selector */}
          <div className="flex rounded-lg border border-line bg-ink-850 p-1">
            <button
              type="button"
              onClick={() => changeMarket('US')}
              className={`rounded-md px-3 py-2 text-[11px] font-medium transition-colors ${
                market === 'US'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇺🇸 US Market
            </button>

            <button
              type="button"
              onClick={() => changeMarket('India')}
              className={`rounded-md px-3 py-2 text-[11px] font-medium transition-colors ${
                market === 'India'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇮🇳 Indian Market
            </button>
          </div>

          {/* Search by ticker or company name */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search stock..."
              aria-label="Search stocks"
              className="w-40 rounded-lg border border-line bg-ink-850 py-2 pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400 sm:w-44"
            />
          </div>

          {/* Asset selector */}
          <select
            value={
              availableAssets.some((asset) => asset.symbol === symbol)
                ? symbol
                : ''
            }
            onChange={(event) => {
              if (event.target.value) {
                setSymbol(event.target.value)
              }
            }}
            aria-label="Select stock or index"
            className="max-w-56 rounded-lg border border-line bg-ink-850 px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
          >
            {!availableAssets.some((asset) => asset.symbol === symbol) && (
              <option value="">Select an asset</option>
            )}

            {displayedAssets.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.name} ({asset.symbol})
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={refreshing}
            title="Refresh market data"
            aria-label="Refresh market data"
            className="rounded-lg border border-line bg-ink-850 p-2.5 text-slate-400 transition-colors hover:text-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-red-300">
              Unable to update market data
            </div>

            <p className="mt-1 break-words text-xs text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Metrics and charts */}
      {marketData && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Current price */}
            <div className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card">
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Current Price
              </div>

              <div className="num mt-2 text-[18px] font-semibold text-slate-100">
                {formatPrice(marketData.currentPrice, symbol)}
              </div>

              <div className={`mt-1 text-xs font-medium ${changeTone}`}>
                {formatPercent(marketData.dailyChangePercent)}
              </div>
            </div>

            <Indicator
              label="Daily Return"
              value={formatPercent(marketData.dailyChangePercent)}
              sub="vs previous close"
              tone={changeTone}
            />

            <Indicator
              label="Volatility (30d)"
              value={
                volatility == null
                  ? '—'
                  : `${Number(volatility).toFixed(2)}%`
              }
              sub="annualized volatility"
              tone={
                volatility != null && Number(volatility) >= 40
                  ? 'text-down'
                  : 'text-slate-100'
              }
            />

            <Indicator
              label="Volume"
              value={volumeDisplay}
              sub="latest daily volume"
            />

            <Indicator
              label="Moving Average (50d)"
              value={formatPrice(movingAverage, symbol)}
              sub="50-day average"
            />

            <div className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card">
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Risk Screening
              </div>

              <div className="mt-2">
                <MetricBadge tone={riskTone}>
                  {riskLabel.toUpperCase()}
                </MetricBadge>
              </div>

              <div className="mt-1.5 text-[10.5px] text-slate-600">
                Based on historical volatility
              </div>
            </div>
          </div>

          {/* Price chart */}
          <ChartCard
            label="Price Action"
            title={`${assetName} (${symbol})`}
            subtitle={`Historical daily closing prices · Yahoo Finance · ${market === 'India' ? 'INR' : 'USD'}`}
            controls={
              <MetricBadge tone="accent">
                <StatusDot tone="accent" />
                {marketData.dataType === 'intraday'
                  ? 'LATEST INTRADAY'
                  : 'LATEST AVAILABLE'}
              </MetricBadge>
            }
          >
            <div className="h-[320px]">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                  >
                    <defs>
                      <linearGradient
                        id="gPrice"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22D3EE"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#22D3EE"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke={gridStroke}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="i"
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={50}
                      tickFormatter={(index) => {
                        const date = history[index]?.date

                        if (!date) return ''

                        return new Date(date).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                          },
                        )
                      }}
                    />

                    <YAxis
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) =>
                        `${currencyPrefix}${Number(value).toLocaleString(
                          market === 'India' ? 'en-IN' : 'en-US',
                          { maximumFractionDigits: 0 },
                        )}`
                      }
                    />

                    <Tooltip
                      content={
                        <ChartTooltip prefix={currencyPrefix} />
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="price"
                      name={symbol}
                      stroke="#22D3EE"
                      strokeWidth={2}
                      fill="url(#gPrice)"
                      dot={false}
                      activeDot={{ r: 3.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No historical price data is available for {symbol}.
                </div>
              )}
            </div>
          </ChartCard>

          {/* Technical indicators */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Indicator
              label="RSI (14d)"
              value={rsi == null ? '—' : Number(rsi).toFixed(2)}
              sub={
                rsi == null
                  ? 'Insufficient historical data'
                  : Number(rsi) >= 70
                    ? 'Potential overbought conditions'
                    : Number(rsi) <= 30
                      ? 'Potential oversold conditions'
                      : 'Between 30 and 70'
              }
              tone={rsiTone}
            />

            <Indicator
              label="Return Trend (30d)"
              value={
                trend == null
                  ? '—'
                  : Number(trend) > 0
                    ? 'Rising'
                    : Number(trend) < 0
                      ? 'Falling'
                      : 'Flat'
              }
              sub={
                trend == null
                  ? 'Trend unavailable'
                  : `${formatPercent(trend)} over the period`
              }
              tone={
                trend == null
                  ? 'text-slate-100'
                  : Number(trend) >= 0
                    ? 'text-up'
                    : 'text-down'
              }
            />

            <Indicator
              label="Previous Close"
              value={formatPrice(marketData.previousClose, symbol)}
              sub="previous daily closing price"
            />

            <Indicator
              label="Data Source"
              value={marketData.source || 'Market API'}
              sub={
                marketData.priceTimestamp
                  ? `Price timestamp: ${new Date(
                      marketData.priceTimestamp,
                    ).toLocaleString()}`
                  : 'Latest available provider data'
              }
            />
          </div>

          <p className="text-[10px] text-slate-600">
            Market data may be delayed. Historical volatility and RSI are
            analytical indicators, not guarantees of future performance.
            Refresh requests data from the configured backend.
          </p>
        </>
      )}
    </div>
  )
}
