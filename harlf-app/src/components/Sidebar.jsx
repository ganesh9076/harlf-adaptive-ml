import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Globe2, Boxes, BrainCircuit, Swords, GitFork,
  TrendingUp, SlidersHorizontal, PieChart, Activity, Settings, X,
} from 'lucide-react'
import { Logo, StatusDot } from './ui.jsx'

const NAV = [
  { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { group: 'Market', items: [
    { to: '/market', label: 'Market Intelligence', icon: Globe2 },
    { to: '/explorer', label: 'Asset Explorer', icon: Boxes, count: 6 },
  ]},
  { group: 'Intelligence', items: [
    { to: '/models', label: 'ML Models', icon: BrainCircuit, count: 4 },
    { to: '/arena', label: 'Model Arena', icon: Swords },
    { to: '/meta', label: 'Meta-Level Selector', icon: GitFork },
    { to: '/forecast', label: 'Return Forecast', icon: TrendingUp },
  ]},
  { group: 'Portfolio', items: [
    { to: '/optimizer', label: 'Optimizer', icon: SlidersHorizontal },
    { to: '/allocation', label: 'Allocation', icon: PieChart },
    { to: '/performance', label: 'Performance', icon: Activity },
  ]},
  { group: 'System', items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
]

function NavItem({ item, onNavigate }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate} className="group relative block outline-none">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-indicator"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent to-accent-deep shadow-glow"
            />
          )}
          <div className={`relative flex items-center gap-2.5 rounded-lg px-3 py-[7px] transition-colors duration-150 ${
            isActive
              ? 'bg-accent/[0.07] text-accent-soft'
              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
          }`}>
            <item.icon className={`h-[15px] w-[15px] transition-colors ${isActive ? 'text-accent' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={1.8} />
            <span className="flex-1 text-[12.5px] font-medium tracking-[0.01em]">{item.label}</span>
            {item.count && (
              <span className={`num rounded border px-1 py-px text-[9px] font-semibold ${isActive ? 'border-accent/30 text-accent' : 'border-line text-slate-600'}`}>
                {item.count}
              </span>
            )}
            {/* Hover preview tooltip */}
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-ink-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 opacity-0 shadow-card transition-all duration-150 group-hover:ml-2 group-hover:opacity-100">
              {item.label}
              <span className="ml-2 font-mono text-[9.5px] uppercase tracking-wider text-slate-500">HARLF</span>
            </span>
          </div>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
  const content = (
    <div className="flex h-full w-[248px] flex-col border-r border-line bg-ink-900/95 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-line px-5 pb-5 pt-6">
        <Logo />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-[0.22em] text-slate-100">HARLF</div>
          <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-slate-500">Adaptive ML Intelligence</div>
        </div>
        <button onClick={onClose} className="ml-auto rounded-md p-1 text-slate-500 hover:text-slate-200 lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center gap-2 border-b border-line px-5 py-2.5">
        <StatusDot tone="up" />
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-up">System Online</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => <NavItem key={item.to} item={item} onNavigate={onClose} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom system panel */}
      <div className="border-t border-line px-4 py-4">
        <div className="rounded-lg border border-line bg-ink-850 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Model Engine</span>
            <StatusDot tone="accent" />
          </div>
          <div className="num text-[13px] font-semibold text-slate-200">4 MODELS ACTIVE</div>
          <div className="mt-0.5 font-mono text-[9.5px] text-slate-600">XGBoost v4.0.2 · meta-layer ready</div>
          <div className="my-2.5 h-px bg-line" />
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Data Status</span>
            <StatusDot tone="up" />
          </div>
          <div className="flex items-center justify-between">
            <span className="num text-[12px] font-semibold text-up">LIVE / READY</span>
            <span className="font-mono text-[9px] text-slate-600">sync 2m ago</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block">{content}</aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden">
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
