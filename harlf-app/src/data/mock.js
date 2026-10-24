
// ─────────────────────────────────────────────────────────────
// HARLF · Mock data layer
// US + Indian market asset support
// ─────────────────────────────────────────────────────────────

// Deterministic PRNG so charts render identically on every load.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAYS = 365
const rand = mulberry32(20261004)
const start = new Date('2025-10-04T00:00:00Z')

const dates = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(start)
  d.setUTCDate(d.getUTCDate() + i)
  return d.toISOString().slice(0, 10)
})

// ── Asset universes ──────────────────────────────────────────

export const assetUniverse = [
  'AAPL',
  'MSFT',
  'NVDA',
  'AMZN',
  'GOOGL',
  'TSLA',
]

export const indianAssets = [
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

export const allAssets = [
  ...assetUniverse.map((symbol) => ({
    symbol,
    name: {
      AAPL: 'Apple Inc.',
      MSFT: 'Microsoft Corporation',
      NVDA: 'NVIDIA Corporation',
      AMZN: 'Amazon.com Inc.',
      GOOGL: 'Alphabet Inc.',
      TSLA: 'Tesla Inc.',
      META: 'Meta Platforms',
      AVGO: 'Broadcom Inc.',
      AMD: 'Advanced Micro Devices',
      INTC: 'Intel Corporation',
      NFLX: 'Netflix Inc.',
      ORCL: 'Oracle Corporation',
      CRM: 'Salesforce Inc.',
      IBM: 'IBM',
      JPM: 'JPMorgan Chase',
      V: 'Visa Inc.',
      MA: 'Mastercard Inc.',
      WMT: 'Walmart Inc.',
      COST: 'Costco Wholesale',
      KO: 'Coca-Cola Company',
      DIS: 'Walt Disney Company',
      UBER: 'Uber Technologies',
      PLTR: 'Palantir Technologies',

    }[symbol],
    market: 'US',
  })),
  ...indianAssets.map((asset) => ({
    ...asset,
    market: 'India',
  })),
]

export const isIndianSymbol = (symbol) =>
  Boolean(
    symbol?.endsWith('.NS') ||
      ['^NSEI', '^BSESN', '^NSEBANK'].includes(symbol),
  )

export const getAssetName = (symbol) =>
  allAssets.find((asset) => asset.symbol === symbol)?.name ?? symbol

export const getAssetMarket = (symbol) =>
  isIndianSymbol(symbol) ? 'India' : 'US'

// ── Cumulative NAV series ────────────────────────────────────

let bench = 100
let port = 100

export const navSeries = dates.map((date, i) => {
  const bShock = (rand() - 0.485) * 1.9
  const pShock = bShock * 1.12 + (rand() - 0.5) * 0.9

  bench = Math.max(60, bench * (1 + bShock / 100))
  port = Math.max(60, port * (1 + pShock / 100))

  const drift = 0.012 * Math.sin(i / 26)

  return {
    date,
    benchmark: +(bench * (1 + drift * 0.35)).toFixed(2),
    portfolio: +(port * (1 + drift)).toFixed(2),
    predicted: +(
      port * (1 + drift) * (1 + 0.006 * Math.sin(i / 9)) -
      0.55
    ).toFixed(2),
  }
})

// ── US mock market data ──────────────────────────────────────

const assetSeed = {
  AAPL: {
    price: 236.48,
    vol: 17.2,
    beta: 1.19,
    sector: 'Technology',
  },
  MSFT: {
    price: 428.11,
    vol: 15.8,
    beta: 0.92,
    sector: 'Technology',
  },
  NVDA: {
    price: 181.24,
    vol: 34.6,
    beta: 1.68,
    sector: 'Semiconductors',
  },
  AMZN: {
    price: 205.73,
    vol: 21.4,
    beta: 1.15,
    sector: 'Consumer Discretionary',
  },
  GOOGL: {
    price: 178.35,
    vol: 18.9,
    beta: 1.05,
    sector: 'Communication',
  },
  TSLA: {
    price: 342.9,
    vol: 41.3,
    beta: 2.31,
    sector: 'Consumer Discretionary',
  },
}

export const assetStats = assetUniverse.map((symbol, idx) => {
  const stock = assetSeed[symbol]

  const change = +(
    ((idx % 3) - 1) * 0.9 +
    rand() * 1.6 -
    0.6
  ).toFixed(2)

  return {
    symbol,
    name: getAssetName(symbol),
    sector: stock.sector,
    price: stock.price,
    change,
    volatility: stock.vol,
    beta: stock.beta,
    volume: Math.round((28 + rand() * 60) * 1e6),
    predReturn: +((rand() - 0.32) * 6).toFixed(2),
    risk:
      stock.vol > 35
        ? 'High'
        : stock.vol > 20
          ? 'Moderate'
          : 'Low',
  }
})

// ── US mock price history ────────────────────────────────────

export const priceHistory = (() => {
  const output = {}

  assetUniverse.forEach((symbol, idx) => {
    const random = mulberry32(9000 + idx * 77)
    let price = assetSeed[symbol].price * (0.82 + random() * 0.1)

    output[symbol] = Array.from({ length: 90 }, (_, i) => {
      price =
        price *
        (1 +
          (random() - 0.48) * 0.032 +
          0.0016 * Math.sin(i / 7 + idx))

      return {
        i,
        price: +price.toFixed(2),
      }
    })

    const scale =
      assetSeed[symbol].price / output[symbol][89].price

    output[symbol] = output[symbol].map((point, i) => ({
      ...point,
      price: +(
        point.price * (1 + (scale - 1) * (i / 89))
      ).toFixed(2),
    }))
  })

  return output
})()

// ── ML model layer ────────────────────────────────────────────

export const models = [
  {
    id: 'lr',
    name: 'Linear Regression',
    short: 'LR',
    status: 'TRAINED',
    version: 'v2.4.1',
    trainState: 'Converged · OLS closed-form',
    mae: 1.842,
    rmse: 2.513,
    r2: 0.741,
    prediction: 0.62,
    confidence: 71,
    color: '#38BDF8',
  },
  {
    id: 'rf',
    name: 'Random Forest',
    short: 'RF',
    status: 'TRAINED',
    version: 'v3.1.0',
    trainState: 'Converged · 500 estimators',
    mae: 1.214,
    rmse: 1.688,
    r2: 0.872,
    prediction: 0.88,
    confidence: 84,
    color: '#22D3EE',
  },
  {
    id: 'xgb',
    name: 'XGBoost',
    short: 'XGB',
    status: 'TRAINED',
    version: 'v4.0.2',
    trainState: 'Converged · early-stop @ 312',
    mae: 0.987,
    rmse: 1.352,
    r2: 0.913,
    prediction: 1.04,
    confidence: 91,
    color: '#34D399',
  },
  {
    id: 'svr',
    name: 'Support Vector Regression',
    short: 'SVR',
    status: 'TRAINED',
    version: 'v1.9.3',
    trainState: 'Converged · RBF kernel',
    mae: 1.489,
    rmse: 2.021,
    r2: 0.806,
    prediction: 0.79,
    confidence: 77,
    color: '#818CF8',
  },
]

// Mock meta-level model scores for US assets.
export const metaScores = assetUniverse.reduce(
  (acc, symbol, idx) => {
    const random = mulberry32(500 + idx * 131)

    const base = {
      xgb: 90 + random() * 8,
      rf: 80 + random() * 8,
      svr: 70 + random() * 8,
      lr: 60 + random() * 8,
    }

    acc[symbol] = Object.entries(base)
      .sort((a, b) => b[1] - a[1])
      .map(([id], rank) => {
        const model = models.find((item) => item.id === id)
        const jitter = random() * 0.14

        return {
          ...model,
          score: +base[id].toFixed(1),
          prediction: +(model.prediction + jitter).toFixed(2),
          error: +(
            model.mae * (0.92 + random() * 0.16)
          ).toFixed(3),
          rank,
        }
      })

    return acc
  },
  {},
)

// ── Forecast layer ──────────────────────────────────────────
// This remains mock-only. Real market and ML pages should use
// their API responses rather than treating these as real forecasts.

export function forecastFor(symbol, horizon) {
  const history = priceHistory[symbol]
  const seed = assetSeed[symbol]

  if (!history || !seed) {
    throw new Error(
      `Mock forecast data is unavailable for ${symbol}. Use the backend API for this asset.`,
    )
  }

  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new Error('Forecast horizon must be a positive integer.')
  }

  const hist = history.slice(-60)
  const last = hist[hist.length - 1].price

  const random = mulberry32(
    horizon * 1000 + symbol.length * 17 + symbol.charCodeAt(0),
  )

  const annualDrift =
    0.07 + (symbol.charCodeAt(0) % 7) * 0.014

  const daily = annualDrift / 252
  const sigma = (seed.vol / 100) / Math.sqrt(252)
  const pred = []

  let price = last

  for (let i = 1; i <= horizon; i++) {
    price =
      price * (1 + daily + (random() - 0.5) * sigma * 0.6)

    const band = last * sigma * Math.sqrt(i) * 1.4

    pred.push({
      i: 60 + i,
      predPrice: +price.toFixed(2),
      bandLow: +(price - band).toFixed(2),
      bandHigh: +(price + band).toFixed(2),
    })
  }

  const ret = +(
    (pred[pred.length - 1].predPrice / last - 1) *
    100
  ).toFixed(2)

  return { hist, pred, last, ret }
}

// ── Optimization layer ──────────────────────────────────────

export const optimizationPresets = {
  Conservative: {
    ret: 6.31,
    risk: 2.84,
    sharpe: 1.62,
    weights: {
      AAPL: 28,
      MSFT: 30,
      NVDA: 8,
      AMZN: 18,
      GOOGL: 16,
    },
  },
  Balanced: {
    ret: 8.42,
    risk: 4.13,
    sharpe: 1.87,
    weights: {
      AAPL: 22,
      MSFT: 19,
      NVDA: 31,
      AMZN: 16,
      GOOGL: 12,
    },
  },
  Aggressive: {
    ret: 11.86,
    risk: 6.72,
    sharpe: 1.54,
    weights: {
      AAPL: 14,
      MSFT: 12,
      NVDA: 46,
      AMZN: 14,
      GOOGL: 14,
    },
  },
}

export const optimizerSteps = [
  'Fetching market data & covariance matrix',
  'Validating asset universe (5 symbols)',
  'Running base-level models: LR · RF · XGB · SVR',
  'Meta-level model selection converging',
  'Solving constrained optimization (SLSQP)',
  'Computing efficient frontier & Sharpe ratio',
]

// ── Performance layer ────────────────────────────────────────

export const performanceMetrics = [
  {
    label: 'Cumulative Return',
    harlf: '+38.4%',
    ew: '+24.1%',
    better: 'up',
  },
  {
    label: 'Annualized Return',
    harlf: '+18.2%',
    ew: '+12.4%',
    better: 'up',
  },
  {
    label: 'Volatility',
    harlf: '11.6%',
    ew: '13.2%',
    better: 'up',
  },
  {
    label: 'Sharpe Ratio',
    harlf: '1.57',
    ew: '0.94',
    better: 'up',
  },
  {
    label: 'Maximum Drawdown',
    harlf: '-8.9%',
    ew: '-13.7%',
    better: 'up',
  },
]

export const riskReturnPoints = [
  ...assetUniverse.map((symbol, i) => ({
    name: symbol,
    volatility: assetStats[i].volatility,
    ret: +(
      assetStats[i].predReturn + 9 + (i % 3) * 3
    ).toFixed(1),
    type: 'asset',
  })),
  {
    name: 'HARLF Optimized',
    volatility: 11.6,
    ret: 18.2,
    type: 'portfolio',
  },
  {
    name: 'Equal Weight',
    volatility: 13.2,
    ret: 12.4,
    type: 'portfolio',
  },
]

// ── Drawdown series ─────────────────────────────────────────

export function drawdownSeries() {
  let portfolioPeak = -Infinity
  let benchmarkPeak = -Infinity

  return navSeries.map((point) => {
    portfolioPeak = Math.max(portfolioPeak, point.portfolio)
    benchmarkPeak = Math.max(benchmarkPeak, point.benchmark)

    return {
      date: point.date,
      harlf: +(
        ((point.portfolio - portfolioPeak) / portfolioPeak) *
        100
      ).toFixed(2),
      ew: +(
        ((point.benchmark - benchmarkPeak) / benchmarkPeak) *
        100
      ).toFixed(2),
    }
  })
}

// ── System status ────────────────────────────────────────────

export const systemStatus = [
  {
    label: 'DATA ENGINE',
    state: 'ONLINE',
    detail: 'Market data served by the configured backend',
  },
  {
    label: 'MODEL ENGINE',
    state: 'READY',
    detail: 'LR · RF · XGBoost · SVR',
  },
  {
    label: 'OPTIMIZER',
    state: 'READY',
    detail: 'Portfolio optimization module',
  },
  {
    label: 'API GATEWAY',
    state: 'CONNECTED',
    detail: 'FastAPI backend',
  },
]

export const datasetInfo = {
  range: '2015-01-02 → 2026-10-02',
  rows: 'Daily OHLCV · supported assets depend on backend data',
  split: 'Train 70% · Validation 15% · Test 15%',
}
