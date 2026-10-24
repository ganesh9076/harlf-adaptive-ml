import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Simulated data fetch: flips loading → loaded after `ms`.
export function useSimulatedLoad(ms = 550) {
  const [state, setState] = useState('loading')
  useEffect(() => {
    const t = setTimeout(() => setState('loaded'), ms)
    return () => clearTimeout(t)
  }, [ms])
  return state
}

// Smooth numeric count-up on mount / when target changes.
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ── Toasts ────────────────────────────────────────────────────
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, tone = 'accent') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={'glass rounded-lg border px-4 py-2.5 text-[13px] shadow-card animate-toast ' +
              (t.tone === 'up' ? 'border-up/30 text-up' : t.tone === 'warn' ? 'border-warn/30 text-warn' : 'border-accent/30 text-accent-soft')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)


// Shared market-intelligence selection. Market Intelligence writes this value;
// ML Models and Model Arena read it so the selected asset flows through the app.
const SELECTED_ASSET_KEY = 'harlf.selectedAsset'

export function useSelectedAsset(defaultValue = 'NVDA') {
  const [symbol, setSymbolState] = useState(() => {
    try {
      return localStorage.getItem(SELECTED_ASSET_KEY) || defaultValue
    } catch {
      return defaultValue
    }
  })

  const setSymbol = useCallback((next) => {
    setSymbolState(next)
    try {
      localStorage.setItem(SELECTED_ASSET_KEY, next)
      window.dispatchEvent(new CustomEvent('harlf:selected-asset', { detail: next }))
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }
  }, [])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SELECTED_ASSET_KEY && event.newValue) setSymbolState(event.newValue)
    }
    const onCustom = (event) => {
      if (event.detail) setSymbolState(event.detail)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('harlf:selected-asset', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('harlf:selected-asset', onCustom)
    }
  }, [])

  return [symbol, setSymbol]
}
