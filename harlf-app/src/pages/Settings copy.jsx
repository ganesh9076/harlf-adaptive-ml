import { useCallback, useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState.jsx'
import { useSimulatedLoad, useToast } from '../hooks.jsx'
import { systemStatus, datasetInfo } from '../data/mock.js'
import { SectionLabel, StatusDot, MetricBadge } from '../components/ui.jsx'

const DEFAULT_API_URL = 'http://localhost:8000'
const DEFAULT_UNIVERSE = 'us_tech_6'

async function fetchJson(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    // The server may return an empty or non-JSON response.
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : `Request failed with HTTP ${response.status}.`
    )
  }

  return data
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toISOString().slice(0, 10)
}

export default function Settings() {
  const state = useSimulatedLoad(500)
  const toast = useToast()

  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [connectionStatus, setConnectionStatus] = useState('CHECKING')
  const [connectionError, setConnectionError] = useState('')
  const [checking, setChecking] = useState(false)

  const [dataset, setDataset] = useState(null)
  const [datasetStatus, setDatasetStatus] = useState('CHECKING')
  const [datasetError, setDatasetError] = useState('')

  const [toggles, setToggles] = useState({
    lr: true,
    rf: true,
    xgb: true,
    svr: true,
    autoSync: true,
  })

  const checkBackend = useCallback(async (showToast = true) => {
    setChecking(true)
    setConnectionStatus('CHECKING')
    setConnectionError('')

    try {
      const baseUrl = apiUrl.trim().replace(/\/+$/, '')

      if (!baseUrl) {
        throw new Error('Enter the FastAPI backend URL.')
      }

      const healthUrl = `${baseUrl}/api/health`
      const health = await fetchJson(healthUrl)

      if (health?.status !== 'ok') {
        throw new Error('The backend responded, but its health check was unexpected.')
      }

      setConnectionStatus('ONLINE')

      if (showToast) {
        toast('FastAPI backend is reachable', 'success')
      }

      return true
    } catch (error) {
      setConnectionStatus('OFFLINE')
      setConnectionError(error.message || 'Unable to reach FastAPI.')

      if (showToast) {
        toast('Could not connect to the FastAPI backend', 'warn')
      }

      return false
    } finally {
      setChecking(false)
    }
  }, [apiUrl, toast])

  const loadDataset = useCallback(async () => {
    setDatasetStatus('CHECKING')
    setDatasetError('')

    try {
      // Use the existing frontend API proxy so session cookies are included.
      const data = await fetchJson(
        `/api/data/prices?universe=${encodeURIComponent(DEFAULT_UNIVERSE)}`
      )

      const dates = Array.isArray(data.dates) ? data.dates : []
      const series = data.series && typeof data.series === 'object'
        ? data.series
        : {}

      const tickers = Object.keys(series)
      const validDates = dates.filter(Boolean)

      setDataset({
        range: validDates.length
          ? `${formatDate(validDates[0])} → ${formatDate(validDates[validDates.length - 1])}`
          : 'Not available',
        rows: `${dates.length.toLocaleString()} daily rows · ${tickers.length} assets`,
        split: datasetInfo.split,
        universe: data.universe || DEFAULT_UNIVERSE,
        downloadedAt: data.meta?.downloaded_at || null,
      })

      setDatasetStatus('ONLINE')
    } catch (error) {
      setDataset(null)
      setDatasetStatus('UNAVAILABLE')
      setDatasetError(
        error.message || 'Unable to load dataset metadata.'
      )
    }
  }, [])

  useEffect(() => {
    checkBackend(false)
    loadDataset()
  }, [checkBackend, loadDataset])

  if (state === 'loading') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-[380px]" />
        <div className="skeleton h-[380px]" />
      </div>
    )
  }

  const statusRows = systemStatus.map((item) => {
    if (item.label.toLowerCase() === 'api gateway') {
      return {
        ...item,
        detail: 'FastAPI health endpoint',
        state: connectionStatus === 'ONLINE'
          ? 'ONLINE'
          : connectionStatus === 'OFFLINE'
            ? 'OFFLINE'
            : 'CHECKING',
      }
    }

    if (item.label.toLowerCase() === 'data engine') {
      return {
        ...item,
        detail: 'Historical dataset availability',
        state: datasetStatus === 'ONLINE'
          ? 'ONLINE'
          : datasetStatus === 'UNAVAILABLE'
            ? 'UNAVAILABLE'
            : 'CHECKING',
      }
    }

    return item
  })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-bold tracking-tight text-slate-100">
          Settings
        </h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          System configuration · backend and dataset connectivity
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
            <div className="mb-4">
              <SectionLabel>API Gateway</SectionLabel>
            </div>

            <label className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
              FastAPI Endpoint
            </label>

            <div className="mt-2 flex gap-2">
              <input
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') checkBackend()
                }}
                aria-label="FastAPI backend URL"
                className="num min-w-0 flex-1 rounded-lg border border-line bg-ink-900/60 px-3 py-2.5 text-[12.5px] text-slate-200 focus:border-accent/40 focus:outline-none"
              />

              <button
                onClick={() => checkBackend()}
                disabled={checking}
                className="rounded-lg border border-accent/30 bg-accent/10 px-4 text-[12px] font-semibold text-accent-soft transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checking ? 'CHECKING...' : 'CONNECT'}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Backend status:{' '}
              <span
                className={
                  connectionStatus === 'ONLINE'
                    ? 'text-emerald-400'
                    : connectionStatus === 'OFFLINE'
                      ? 'text-red-400'
                      : 'text-amber-400'
                }
              >
                {connectionStatus}
              </span>
            </p>

            {connectionError && (
              <p className="mt-1 break-words text-[11px] text-red-400">
                {connectionError}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
            <div className="mb-4">
              <SectionLabel>Model Engine</SectionLabel>
            </div>

            <div className="space-y-2.5">
              {[
                ['lr', 'Linear Regression'],
                ['rf', 'Random Forest'],
                ['xgb', 'XGBoost'],
                ['svr', 'Support Vector Regression'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={toggles[id]}
                  onClick={() =>
                    setToggles((current) => ({
                      ...current,
                      [id]: !current[id],
                    }))
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-line bg-ink-900/50 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="flex items-center gap-2.5 text-[12.5px] text-slate-300">
                    <StatusDot tone={toggles[id] ? 'up' : 'down'} />
                    {label}
                  </span>

                  <span
                    className={`relative h-4.5 w-8 rounded-full transition-colors ${
                      toggles[id] ? 'bg-accent/30' : 'bg-ink-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                        toggles[id]
                          ? 'left-4 bg-accent'
                          : 'left-0.5 bg-slate-500'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-slate-500">
              These switches control the Settings page display only. They do
              not enable or disable backend models.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
            <div className="mb-4">
              <SectionLabel>System Status</SectionLabel>
            </div>

            <div className="space-y-2.5">
              {statusRows.map((item) => {
                const good = item.state === 'ONLINE' || item.state === 'READY'
                const pending = item.state === 'CHECKING'
                const tone = good ? 'up' : pending ? 'warn' : 'down'

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-slate-600">
                        {item.detail}
                      </div>
                    </div>

                    <MetricBadge tone={tone}>
                      <StatusDot tone={tone} /> {item.state}
                    </MetricBadge>
                  </div>
                )
              })}
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-slate-500">
              Model engine and optimizer statuses are supplied by the existing
              application status configuration; they are not independent live
              health checks.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-ink-850/80 p-5 shadow-card">
            <div className="mb-4">
              <SectionLabel>Dataset</SectionLabel>
            </div>

            <div className="space-y-2 text-[12px] text-slate-400">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Date range</span>
                <span className="num text-right">
                  {dataset?.range || '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Corpus</span>
                <span className="num text-right">
                  {dataset?.rows || '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Universe</span>
                <span className="num text-right">
                  {dataset?.universe || DEFAULT_UNIVERSE}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Split</span>
                <span className="num text-right">
                  {dataset?.split || datasetInfo.split}
                </span>
              </div>

              {dataset?.downloadedAt && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Last data refresh</span>
                  <span className="num text-right">
                    {formatDate(dataset.downloadedAt)}
                  </span>
                </div>
              )}

              {datasetStatus === 'CHECKING' && (
                <p className="mt-3 text-[11px] text-amber-400">
                  Checking dataset availability...
                </p>
              )}

              {datasetError && (
                <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-red-400">
                  Dataset unavailable: {datasetError}
                  <p className="mt-1 text-slate-500">
                    The current session may need authentication, or the
                    selected dataset may not be available.
                  </p>
                </div>
              )}

              {datasetStatus === 'ONLINE' && (
                <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
                  Dataset metadata loaded from the FastAPI data endpoint.
                  This does not guarantee that every ML model or forecast
                  endpoint is working.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}