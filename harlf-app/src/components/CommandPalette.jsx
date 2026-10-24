import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CornerDownLeft } from 'lucide-react'
import {
  LayoutDashboard, Globe2, BrainCircuit, Swords, TrendingUp, SlidersHorizontal, Activity,
} from 'lucide-react'

const ITEMS = [
  { label: 'Dashboard', desc: 'Portfolio intelligence overview', icon: LayoutDashboard, to: '/' },
  { label: 'Market Intelligence', desc: 'Asset analysis workspace', icon: Globe2, to: '/market' },
  { label: 'ML Models', desc: 'Base-level model lab', icon: BrainCircuit, to: '/models' },
  { label: 'Model Arena', desc: 'Head-to-head model comparison', icon: Swords, to: '/arena' },
  { label: 'Forecast', desc: 'Return prediction workspace', icon: TrendingUp, to: '/forecast' },
  { label: 'Optimizer', desc: 'Portfolio optimization engine', icon: SlidersHorizontal, to: '/optimizer' },
  { label: 'Performance', desc: 'Backtest & risk analysis', icon: Activity, to: '/performance' },
]

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const filtered = useMemo(
    () => ITEMS.filter((i) => (i.label + i.desc).toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  useEffect(() => { if (open) { setQuery(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => setIndex(0), [query])

  const go = (item) => { navigate(item.to); onClose() }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[index]) go(filtered[index])
    else if (e.key === 'Escape') onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[80] bg-ink-950/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed left-1/2 top-[18vh] z-[85] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-ink-850 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-slate-500" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
                placeholder="Jump to a workspace…"
                className="h-12 flex-1 bg-transparent text-[13.5px] text-slate-100 placeholder:text-slate-600 focus:outline-none" />
              <kbd className="rounded border border-line bg-ink-800 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500">ESC</kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-slate-500">No matches for “{query}”</div>}
              {filtered.map((item, i) => (
                <button key={item.to} onClick={() => go(item)} onMouseEnter={() => setIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${i === index ? 'bg-accent/[0.08]' : ''}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${i === index ? 'border-accent/30 text-accent' : 'border-line text-slate-500'}`}>
                    <item.icon className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <span className="flex-1">
                    <span className={`block text-[13px] font-medium ${i === index ? 'text-accent-soft' : 'text-slate-200'}`}>{item.label}</span>
                    <span className="block text-[11px] text-slate-500">{item.desc}</span>
                  </span>
                  {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-accent" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-line bg-ink-900/60 px-4 py-2">
              <span className="font-mono text-[9.5px] text-slate-600">↑↓ NAVIGATE</span>
              <span className="font-mono text-[9.5px] text-slate-600">↵ OPEN</span>
              <span className="ml-auto font-mono text-[9.5px] text-slate-600">HARLF COMMAND</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
