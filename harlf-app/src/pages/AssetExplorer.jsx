import { useEffect, useMemo, useState } from 'react' 
import { Search, TrendingUp, Activity, BarChart3 } from 'lucide-react' 
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts' 
import { getMarketIntelligence } from '../api/services.js' 
 
import { useSelectedAsset, useSimulatedLoad } from '../hooks.jsx' 
import { 
  assetStats, 
  priceHistory, 
  assetUniverse, 
  indianAssets, 
  getAssetName, 
  isIndianSymbol, 
} from '../data/mock.js' 
import { 
  MetricBadge, 
  DeltaChip, 
  EmptyState, 
} from '../components/ui.jsx' 
 
const riskTone = { 
  High: 'down', 
  Moderate: 'warn', 
  Low: 'up', 
} 
 
const indianSector = { 
  'RELIANCE.NS': 'Energy & Retail', 
  'TCS.NS': 'Information Technology', 
  'HDFCBANK.NS': 'Banking', 
  'ICICIBANK.NS': 'Banking', 
  'INFY.NS': 'Information Technology', 
  'SBIN.NS': 'Banking', 
  'BHARTIARTL.NS': 'Telecommunications', 
  'ITC.NS': 'Consumer Goods', 
  'LT.NS': 'Engineering', 
  'SUNPHARMA.NS': 'Pharmaceuticals', 
  'MARUTI.NS': 'Automobiles', 
  'TATAMOTORS.NS': 'Automobiles', 
  'TITAN.NS': 'Consumer Goods', 
  'HINDUNILVR.NS': 'Consumer Goods', 
  'AXISBANK.NS': 'Banking', 
  'KOTAKBANK.NS': 'Banking', 
  'WIPRO.NS': 'Information Technology', 
  'HCLTECH.NS': 'Information Technology', 
  'TATASTEEL.NS': 'Metals', 
  'POWERGRID.NS': 'Utilities', 
  'NTPC.NS': 'Utilities', 
  'ONGC.NS': 'Energy', 
} 
 
const indianIndices = ['^NSEI', '^BSESN', '^NSEBANK'] 
 
function formatPrice(price, symbol) { 
  if (price == null || !Number.isFinite(price)) return '—' 
 
  const currency = isIndianSymbol(symbol) ? '₹' : '$' 
 
  return `${currency}${price.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2, 
  })}` 
} 
 
function makeDemoSeries(symbol, basePrice) { 
  // Deterministic illustrative data only—not market prices. 
  let seed = [...symbol].reduce( 
    (total, char) => total + char.charCodeAt(0), 
    17, 
  ) 
 
  const random = () => { 
    seed = (seed * 9301 + 49297) % 233280 
    return seed / 233280 
  } 
 
  let price = basePrice * 0.94 
 
  return Array.from({ length: 30 }, (_, i) => { 
    price *= 1 + (random() - 0.47) * 0.025 
 
    return { 
      i, 
      price: Number(price.toFixed(2)), 
    } 
  }) 
} 
 
export default function AssetExplorer() { 
  const state = useSimulatedLoad(550) 
  const [query, setQuery] = useState('') 
   
const [market, setMarket] = useState('US') 

const [sortBy, setSortBy] = useState('symbol')
const [sortDirection, setSortDirection] = useState('asc')
const [quickFilter, setQuickFilter] = useState('all')

const [selectedSymbol, setSelectedSymbol] = 
  useSelectedAsset('NVDA') 
 
const handleMarketChange = (nextMarket) => { 
  setMarket(nextMarket) 
 
  const selectedIsIndian = isIndianSymbol(selectedSymbol) 
 
  if (nextMarket === 'India' && !selectedIsIndian) { 
    setSelectedSymbol('^NSEI') 
  } else if (nextMarket === 'US' && selectedIsIndian) { 
    setSelectedSymbol('NVDA') 
  } 
} 
 
const [indianData, setIndianData] = useState(null) 
const [indianLoading, setIndianLoading] = useState(false) 
const [indianError, setIndianError] = useState('') 
 


useEffect(() => {
  let cancelled = false

  async function loadMarketData() {
    setIndianLoading(true)
    setIndianError('')
    setIndianData({})

    try {
      const symbols =
        market === 'India'
          ? indianAssets.map((asset) => asset.symbol)
          : assetStats.map((asset) => asset.symbol)

      const results = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const result = await getMarketIntelligence(symbol)
          return [symbol, result]
        })
      )

      if (cancelled) return

      const dataBySymbol = {}

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [symbol, data] = result.value
          dataBySymbol[symbol] = data
        }
      })

      setIndianData(dataBySymbol)

      if (Object.keys(dataBySymbol).length === 0) {
        setIndianError(`Unable to load ${market} market data.`)
      }
    } catch (error) {
      if (!cancelled) {
        setIndianError(
          error.message || 'Failed to load market data.'
        )
      }
    } finally {
      if (!cancelled) setIndianLoading(false)
    }
  }

  loadMarketData()

  return () => {
    cancelled = true
  }
}, [market])


 
  const rows = useMemo(() => { 
    const search = query.trim().toLowerCase() 
 
    if (market === 'US') { 
      return assetStats 
        .filter((asset) => 
          `${asset.symbol} ${asset.name} ${asset.sector}` 
            .toLowerCase() 
            .includes(search), 
        ) 
        .map((asset) => {
  const data = indianData?.[asset.symbol] ?? null

  return {
    ...asset,
    market: 'US',
    dataAvailable: Boolean(data),
    price: data?.currentPrice ?? asset.price,
    change: data?.dailyChangePercent ?? asset.change,
    volatility: data?.volatility30d ?? asset.volatility,
    volume: data?.volume ?? null,
  }
})
    } 
 
     
return indianAssets 
  .filter((asset) => 
    `${asset.symbol} ${asset.name} ${ 
      indianSector[asset.symbol] || 'Market Index' 
    }` 
      .toLowerCase() 
      .includes(search) 
  ) 
  .map((asset) => { 
    const data = indianData?.[asset.symbol] ?? null
 
    return { 
      symbol: asset.symbol, 
      name: asset.name, 
      sector: indianIndices.includes(asset.symbol) 
        ? 'Market Index' 
        : indianSector[asset.symbol] || 'Other', 
      market: 'India', 
      dataAvailable: Boolean(data), 
      price: data?.currentPrice ?? null, 
      change: data?.dailyChangePercent ?? null, 
      volatility: data?.volatility30d ?? null, 
      volume: data?.volume ?? null, 
    } 
  }) 
  }, [market, query, indianData])

  
const visibleRows = useMemo(() => {
  const filtered = rows.filter((asset) => {
    const change = asset.change
    const volatility = asset.volatility

    if (quickFilter === 'gainers') {
      return change != null && change > 0
    }

    if (quickFilter === 'losers') {
      return change != null && change < 0
    }

    if (quickFilter === 'low-risk') {
      return volatility != null && volatility < 20
    }

    return true
  })

  return [...filtered].sort((a, b) => {
    let first
    let second

    if (sortBy === 'symbol') {
      first = a.symbol
      second = b.symbol

      return sortDirection === 'asc'
        ? first.localeCompare(second)
        : second.localeCompare(first)
    }

    if (sortBy === 'price') {
      first = a.price
      second = b.price
    } else if (sortBy === 'change') {
      first = a.change
      second = b.change
    } else {
      first = a.volatility
      second = b.volatility
    }

    if (first == null) return 1
    if (second == null) return -1

    return sortDirection === 'asc'
      ? first - second
      : second - first
  })
}, [rows, quickFilter, sortBy, sortDirection])

 
  const selectedAsset = rows.find( 
    (asset) => asset.symbol === selectedSymbol, 
  ) 
 
  // Use existing US mock metrics where available. 
  // Indian market values are not fabricated. 
  const selectedUSStats = assetStats.find(
  (asset) => asset.symbol === selectedSymbol,
)

const selectedLiveData =
  indianData?.[selectedSymbol] ?? null 
 
 const selectedIndianData =
  market === 'India'
    ? indianData?.[selectedSymbol] ?? null
    : null
 
  
const selectedHistory = (
  indianData?.[selectedSymbol]?.history || []
).map((point, index) => ({
  i: index,
  date: point.date,
  price: point.price,
}))
 
 
  if (state === 'loading') { 
    return ( 
      <div className="space-y-4"> 
        <div className="skeleton h-10 w-full max-w-sm" /> 
        <div className="skeleton h-[420px]" /> 
      </div> 
    ) 
  } 
 
  return ( 
    <div className="space-y-5"> 
      <div className="flex flex-wrap items-center justify-between gap-3"> 
        <div> 
          <h2 className="text-[20px] font-bold tracking-tight text-slate-100"> 
            Asset Explorer 
          </h2> 
          <p className="mt-1 text-[12.5px] text-slate-500"> 
            Explore assets, compare risk metrics, and inspect price trends 
          </p> 
        </div> 
 
        <div className="flex flex-wrap items-center gap-2"> 
          <div className="flex rounded-lg border border-line bg-ink-900 p-1"> 
            {['US', 'India'].map((item) => ( 
              <button 
                key={item} 
                type="button" 
                onClick={() => { 
                  handleMarketChange(item) 
                  setQuery('') 
                }} 
                className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${ 
                  market === item 
                    ? 'bg-accent text-white' 
                    : 'text-slate-400 hover:text-slate-100' 
                }`} 
              > 
                {item === 'US' ? 'US Market' : 'Indian Market'} 
              </button> 
            ))} 
          </div> 
 
          <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 md:w-[260px]"> 
            <Search className="h-3.5 w-3.5 text-slate-500" /> 
            <input 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder="Search symbol or company..." 
              className="w-full bg-transparent text-[12.5px] text-slate-100 placeholder:text-slate-600 focus:outline-none" 
            /> 
          </div> 
        </div> 

         {/* Quick filters — ADD THIS BLOCK */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'All assets', value: 'all' },
          { label: 'Gainers', value: 'gainers' },
          { label: 'Losers', value: 'losers' },
          { label: 'Low volatility', value: 'low-risk' },
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setQuickFilter(filter.value)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              quickFilter === filter.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-slate-400 hover:text-slate-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

        
      </div> 
 
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]"> 
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-ink-850/80 shadow-card"> 
          <div className="flex items-center justify-between border-b border-line px-4 py-3"> 
            <div> 
              <h3 className="text-sm font-semibold text-slate-100"> 
                {market === 'US' ? 'US Assets' : 'Indian Assets'} 
              </h3> 
              <p className="mt-1 text-[11px] text-slate-500"> 
                {rows.length} results · Select an asset to sync it across tabs 
              </p> 
            </div> 
            <span className="rounded-md border border-line px-2 py-1 text-[10px] text-slate-400"> 
              {market === 'US' ? 'USD · $' : 'INR · ₹'} 
            </span> 
          </div> 
 
          <div className="overflow-x-auto"> 
            <table className="w-full min-w-[680px] text-left"> 
              <thead> 
                <tr className="border-b border-line bg-ink-900/60"> 
                  {[ 
                    'Asset', 
                    'Sector', 
                    'Price', 
                    '24h', 
                    'Risk', 
                  ].map((heading) => ( 
                    <th 
                      key={heading} 
                      className="whitespace-nowrap px-4 py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600" 
                    > 
                      {heading} 
                    </th> 
                  ))} 
                </tr> 
              </thead> 
 
              <tbody className="divide-y divide-line"> 
                {visibleRows.map((asset) => {
                  
const price = asset.price ?? null
const change = asset.change ?? null
const volatility = asset.volatility ?? null
 
 
                  const active = 
                    selectedSymbol === asset.symbol 
 
                  return ( 
                    <tr 
                      key={asset.symbol} 
                      onClick={() => setSelectedSymbol(asset.symbol)} 
                      title={`Select ${asset.symbol}`} 
                      className={`cursor-pointer transition-colors hover:bg-white/[0.04] ${ 
                        active 
                          ? 'bg-accent/[0.07] ring-1 ring-inset ring-accent/30' 
                          : '' 
                      }`} 
                    > 
                      <td className="px-4 py-3"> 
                        <div className="text-[12px] font-semibold text-slate-100"> 
                          {asset.symbol} 
                        </div> 
                        <div className="mt-1 text-[10px] text-slate-500"> 
                          {asset.name} 
                        </div> 
                      </td> 
 
                      <td className="px-4 py-3 text-[11px] text-slate-400"> 
                        {asset.sector} 
                      </td> 
 
                      <td className="num px-4 py-3 text-[12px] font-semibold text-slate-200"> 
                       {price != null 
                        ? formatPrice(price, asset.symbol) 
                        : indianLoading && market === 'India' 
                         ? 'Loading...' 
                         : '—'} 
                      </td> 
 
                      <td className="px-4 py-3"> 
                       {change != null ? ( 
                        <DeltaChip value={change} /> 
                      ) : ( 
                       <span className="text-[11px] text-slate-600"> 
                        {indianError && market === 'India' 
                          ? 'Unavailable' 
                          : 'Not available'} 
                       </span> 
                      )} 
                      </td> 
 
                    <td className="px-4 py-3"> 
                       {volatility != null ? ( 
                        <MetricBadge 
                         tone={ 
                          volatility >= 35 
                           ? 'down' 
                           : volatility >= 20 
                            ? 'warn' 
                            : 'up' 
                        } 
                      > 
                        {volatility.toFixed(1)}% 
                       </MetricBadge> 
                    ) : ( 
                      <span className="text-[10px] text-slate-600"> 
                        Not calculated 
                      </span> 
                    )} 
                  </td> 
                  </tr> 
                  ) 
                })} 
              </tbody> 
            </table> 
          </div> 
 
          {visibleRows.length === 0 && (
            <EmptyState 
              title="No assets match your search" 
              hint="Try a different symbol or company name." 
            /> 
          )} 
        </section> 
 
        <aside className="min-w-0 space-y-4"> 
          <section className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card"> 
            <div className="flex items-start justify-between gap-3"> 
              <div> 
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500"> 
                  Selected Asset 
                </p> 
                <h3 className="mt-2 text-lg font-bold text-slate-100"> 
                  {getAssetName(selectedSymbol)} 
                </h3> 
                <p className="mt-1 text-xs text-slate-500"> 
                  {selectedSymbol} 
                </p> 
              </div> 
              <div className="rounded-lg border border-line bg-ink-900 p-2"> 
                <TrendingUp className="h-5 w-5 text-accent" /> 
              </div> 
            </div> 
 
            
{selectedUSStats ? (
  <>
    <div className="mt-5">
     <p className="text-[10px] uppercase tracking-wider text-slate-500">
  Current price · live market data
</p>

<p className="num mt-1 text-2xl font-bold text-slate-100">
  {selectedLiveData?.currentPrice != null
    ? formatPrice(selectedLiveData.currentPrice, selectedSymbol)
    : formatPrice(selectedUSStats.price, selectedSymbol)}
</p>

<div className="mt-2">
  {selectedLiveData?.dailyChangePercent != null ? (
    <DeltaChip value={selectedLiveData.dailyChangePercent} />
  ) : (
    <DeltaChip value={selectedUSStats.change} />
  )}
</div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3">
  <div className="rounded-lg border border-line bg-ink-900/60 p-3">
    <p className="text-[10px] text-slate-500">Volatility (30d)</p>
    <p className="mt-1 text-sm font-semibold text-slate-200">
      {selectedLiveData?.volatility30d != null
        ? `${selectedLiveData.volatility30d.toFixed(2)}%`
        : 'Unavailable'}
    </p>
  </div>

  <div className="rounded-lg border border-line bg-ink-900/60 p-3">
    <p className="text-[10px] text-slate-500">50-day moving average</p>
    <p className="mt-1 text-sm font-semibold text-slate-200">
      {selectedLiveData?.movingAverage50d != null
        ? formatPrice(selectedLiveData.movingAverage50d, selectedSymbol)
        : 'Unavailable'}
    </p>
  </div>

  <div className="rounded-lg border border-line bg-ink-900/60 p-3">
    <p className="text-[10px] text-slate-500">Volume</p>
    <p className="mt-1 text-sm font-semibold text-slate-200">
      {selectedLiveData?.volume != null
        ? Number(selectedLiveData.volume).toLocaleString('en-IN')
        : 'Unavailable'}
    </p>
  </div>

  <div className="rounded-lg border border-line bg-ink-900/60 p-3">
    <p className="text-[10px] text-slate-500">RSI (14d)</p>
    <p className="mt-1 text-sm font-semibold text-slate-200">
      {selectedLiveData?.rsi14 != null
        ? selectedLiveData.rsi14.toFixed(2)
        : 'Unavailable'}
    </p>
  </div>
</div>

    <div className="mt-4 border-t border-line pt-4">
  <div className="flex items-center justify-between">
    <span className="text-xs text-slate-400">30-day return trend</span>
    <span className="text-xs font-semibold text-slate-200">
      {selectedLiveData?.trend30dPercent != null
        ? `${selectedLiveData.trend30dPercent >= 0 ? '+' : ''}${selectedLiveData.trend30dPercent.toFixed(2)}%`
        : 'Unavailable'}
    </span>
  </div>

  <p className="mt-2 text-[10px] text-slate-500">
    Source: {selectedLiveData?.source || 'Backend'}
  </p>
</div>
  </>

) : market === 'India' ? (
  <div className="mt-5 rounded-lg border border-line bg-ink-900/60 p-4">
    <p className="text-sm font-medium text-slate-200">
      {selectedAsset?.name || getAssetName(selectedSymbol)}
    </p>

    {indianLoading ? (
      <p className="mt-3 text-xs text-slate-400">
        Fetching market data from the backend...
      </p>
    ) : indianError && !selectedIndianData ? (
      <p className="mt-3 text-xs leading-5 text-red-400">
        Failed to load market data: {indianError}
      </p>
    ) : selectedIndianData ? (
      <>
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Current price
          </p>

          <p className="num mt-1 text-2xl font-bold text-slate-100">
            {formatPrice(selectedIndianData.currentPrice, selectedSymbol)}
          </p>

          <div className="mt-2">
            {selectedIndianData.dailyChangePercent != null ? (
              <DeltaChip value={selectedIndianData.dailyChangePercent} />
            ) : (
              <span className="text-xs text-slate-500">
                Daily change unavailable
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">Previous close</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {selectedIndianData.previousClose != null
                ? formatPrice(selectedIndianData.previousClose, selectedSymbol)
                : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">Volume</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {selectedIndianData.volume != null
                ? Number(selectedIndianData.volume).toLocaleString('en-IN')
                : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">Volatility (30d)</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {selectedIndianData.volatility30d != null
                ? `${Number(selectedIndianData.volatility30d).toFixed(2)}%`
                : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">50-day moving average</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {selectedIndianData.movingAverage50d != null
                ? formatPrice(selectedIndianData.movingAverage50d, selectedSymbol)
                : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">RSI (14)</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {selectedIndianData.rsi14 != null
                ? Number(selectedIndianData.rsi14).toFixed(2)
                : '—'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink-900/60 p-3">
            <p className="text-[10px] text-slate-500">30-day return</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                selectedIndianData.trend30dPercent == null
                  ? 'text-slate-200'
                  : selectedIndianData.trend30dPercent >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
              }`}
            >
              {selectedIndianData.trend30dPercent != null
                ? `${selectedIndianData.trend30dPercent >= 0 ? '+' : ''}${Number(selectedIndianData.trend30dPercent).toFixed(2)}%`
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[10px] text-slate-500">
            Source: {selectedIndianData.source || 'Backend'}
          </p>

          {selectedIndianData.priceTimestamp && (
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Latest price timestamp:{' '}
              {new Date(selectedIndianData.priceTimestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
      </>
    ) : (
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Market data has not been returned for this asset.
      </p>
    )}
  </div>
) : (
  <div className="mt-5 rounded-lg border border-line bg-ink-900/60 p-4">
    <p className="text-sm font-medium text-slate-200">
      {selectedAsset?.name || 'Asset selected'}
    </p>
    <p className="mt-2 text-xs leading-5 text-slate-400">
      Detailed US market metrics are unavailable for this asset.
    </p>
  </div>
)}
 
          </section> 
 
          <section className="rounded-xl border border-line bg-ink-850/80 p-4 shadow-card"> 
            <div className="flex items-center justify-between gap-2"> 
              <div> 
                <h3 className="text-sm font-semibold text-slate-100"> 
                  Price Trend 
                </h3> 
                <p className="mt-1 text-[10px] text-slate-500"> 
                  
{selectedHistory.length
  ? 'Historical market prices · 30-day view'
  : indianLoading
    ? 'Loading price history...'
    : 'Price history unavailable'}

                </p> 
              </div> 
              <Activity className="h-4 w-4 text-slate-500" /> 
            </div> 
 
            {selectedHistory.length > 0 ? ( 
              <> 
                <div className="mt-4 h-36"> 
                  <ResponsiveContainer width="100%" height="100%"> 
                    <LineChart data={selectedHistory.slice(-30)}> 
                      <Tooltip 
                        contentStyle={{ 
                          background: '#0B1220', 
                          border: '1px solid #263449', 
                          borderRadius: 8, 
                          fontSize: 11, 
                        }} 
                        formatter={(value) => [ 
                          formatPrice(value, selectedSymbol), 
                          'Price', 
                        ]} 
                        labelFormatter={(label, payload) => 
                         market === 'India' 
                          ? payload?.[0]?.payload?.date 
                           ? new Date(payload[0].payload.date).toLocaleDateString('en-IN') 
                           : '' 
                          : `Point ${label}` 
                        } 
                      /> 
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#38BDF8" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 3 }} 
                      /> 
                    </LineChart> 
                  </ResponsiveContainer> 
                </div> 
                <p className="mt-2 text-[10px] leading-4 text-slate-500"> 
                  Market data source: {indianData?.[selectedSymbol]?.source || 'Backend'}
                </p> 
              </> 
            ) : ( 
              <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-line text-center"> 
                <BarChart3 className="h-6 w-6 text-slate-600" /> 
                <p className="mt-2 text-xs text-slate-400"> 
                  No historical series available 
                </p> 
                <p className="mt-1 text-[10px] text-slate-600"> 
                  A backend data response is needed for this asset. 
                </p> 
              </div> 
            )} 
          </section> 
 
          <p className="px-1 text-[10px] leading-4 text-slate-600"> 
            Risk and predicted returns are model outputs, not guarantees. 
            Mock values must not be used as investment advice. 
          </p> 
        </aside> 
      </div> 
    </div> 
  ) 
}