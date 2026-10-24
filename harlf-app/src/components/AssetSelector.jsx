
import { motion } from 'framer-motion'

// Segmented ticker selector used across Market / Forecast / Meta pages.
export default function AssetSelector({ assets = [], value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-ink-850 p-1">
      {assets.map((asset) => {
        // Support both string symbols and asset objects.
        const symbol =
          typeof asset === 'string' ? asset : asset?.symbol

        if (!symbol) return null

        const active = symbol === value

        return (
          <button
            key={symbol}
            onClick={() => onChange(symbol)}
            className={`relative rounded-md px-3 py-1.5 font-mono text-[11.5px] font-semibold tracking-wide transition-colors ${
              active
                ? 'text-ink-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId="asset-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-md bg-gradient-to-r from-accent-soft to-accent"
              />
            )}

            <span className="relative">{symbol}</span>
          </button>
        )
      })}
    </div>
  )
}
