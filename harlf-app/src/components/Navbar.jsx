import { useEffect, useState } from 'react'
import {
  Bell, Command, LogOut, Menu, Search, UserRound,
  ChevronDown, Check, CheckCheck, CircleDot,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusDot } from './ui.jsx'

const TITLES = {
  '/': ['Overview', 'Dashboard'],
  '/market': ['Market', 'Market Intelligence'],
  '/explorer': ['Market', 'Asset Explorer'],
  '/models': ['Intelligence', 'ML Model Lab'],
  '/arena': ['Intelligence', 'Model Arena'],
  '/meta': ['Intelligence', 'Meta-Level Selector'],
  '/forecast': ['Intelligence', 'Return Forecast'],
  '/optimizer': ['Portfolio', 'Optimizer'],
  '/allocation': ['Portfolio', 'Allocation'],
  '/performance': ['Portfolio', 'Performance'],
  '/settings': ['System', 'Settings'],
}

const UNIVERSES = [
  { id: 'us_tech_6', label: 'US-TECH-6', description: 'Six US technology stocks' },
  { id: 'sp500', label: 'S&P 500', description: 'Broad US large-cap universe' },
  { id: 'custom', label: 'Custom', description: 'User-selected ticker symbols' },
]

function getMarketStatus() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const get = (type) => parts.find((part) => part.type === type)?.value
  const weekday = get('weekday')
  const minutes = Number(get('hour')) * 60 + Number(get('minute'))
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)

  // Regular NYSE hours: 9:30 AM–4:00 PM ET. Typical extended hours: 4:00–9:30 AM and 4:00–8:00 PM ET.
  // This clock-based check does not include exchange holidays or early closes.
  if (!isWeekday) return 'CLOSED'
  if (minutes >= 240 && minutes < 570) return 'PRE-MARKET'
  if (minutes >= 570 && minutes < 960) return 'OPEN'
  if (minutes >= 960 && minutes < 1200) return 'AFTER-HOURS'
  return 'CLOSED'
}

export default function Navbar({
  path,
  onOpenPalette,
  onOpenSidebar,
  user = null,
  universe: universeProp,
  onUniverseChange,
}) {
  const [section, title] = TITLES[path] ?? ['HARLF', 'Dashboard']
  const [signingOut, setSigningOut] = useState(false)
  const [marketStatus, setMarketStatus] = useState(getMarketStatus)
  const [universeOpen, setUniverseOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [universe, setUniverse] = useState(universeProp || 'us_tech_6')
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'HARLF is ready',
      message: 'Your dashboard session is active.',
      time: 'This session',
      read: false,
    },
    {
      id: 2,
      title: 'Market data reminder',
      message: 'Verify the latest market data before relying on forecasts.',
      time: 'Reminder',
      read: false,
    },
  ])

  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarketStatus(getMarketStatus())
    }, 60000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (universeProp) setUniverse(universeProp)
  }, [universeProp])

  const userName = user?.name || user?.full_name || 'User'
  const userEmail = user?.email || ''
  const initials =
    userName.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0]).join('').toUpperCase() || 'U'

  const selectedUniverse =
    UNIVERSES.find((item) => item.id === universe) || UNIVERSES[0]

  const unreadCount = notifications.filter((item) => !item.read).length

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Sign out failed')

      navigate('/login', { replace: true })
      window.location.reload()
    } catch (error) {
      console.error('Sign out failed:', error)
      setSigningOut(false)
      window.alert('Unable to sign out. Please try again.')
    }
  }

  function chooseUniverse(item) {
    setUniverse(item.id)
    onUniverseChange?.(item.id)
    setUniverseOpen(false)
  }

  function markAllRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    )
  }

  function markRead(id) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink-900/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
        className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200 lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 sm:block">
          {section}
        </span>
        <span className="hidden text-slate-700 sm:block">/</span>
        <h1 className="truncate text-[14px] font-semibold tracking-tight text-slate-100">
          {title}
        </h1>
      </div>

      <button
        onClick={onOpenPalette}
        className="mx-auto hidden items-center gap-2.5 rounded-lg border border-line bg-ink-850 px-3 py-1.5 text-slate-500 transition-colors hover:border-accent/30 hover:text-slate-300 md:flex md:w-[300px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left text-[12px]">
          Search anything…
        </span>
        <span className="flex items-center gap-0.5 rounded border border-line bg-ink-800 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500">
          <Command className="h-2.5 w-2.5" /> K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Approximate NYSE status */}
        <div
          title="Based on regular New York trading hours; exchange holidays and early closes are not checked"
          className="hidden items-center gap-2 rounded-lg border border-line bg-ink-850 px-2.5 py-1.5 xl:flex"
        >
          <StatusDot tone={marketStatus === 'OPEN' ? 'up' : 'down'} />
          <span className={`font-mono text-[10px] font-semibold tracking-wider ${
            marketStatus === 'OPEN'
              ? 'text-up'
              : marketStatus === 'PRE-MARKET' || marketStatus === 'AFTER-HOURS'
                ? 'text-amber-300'
                : 'text-slate-500'
          }`}>
            NYSE · {marketStatus}
          </span>
        </div>

        {/* Universe selector */}
        <div className="relative hidden md:block">
          <button
            type="button"
            aria-expanded={universeOpen}
            onClick={() => {
              setUniverseOpen((value) => !value)
              setNotificationsOpen(false)
            }}
            className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-2.5 py-1.5 font-mono text-[10px] tracking-wider text-slate-400 hover:border-accent/40"
          >
            UNIVERSE:
            <span className="text-accent-soft">{selectedUniverse.label}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {universeOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-ink-900 p-2 shadow-2xl">
              <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Select universe
              </div>
              {UNIVERSES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseUniverse(item)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-slate-200">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      {item.description}
                    </span>
                  </span>
                  {universe === item.id && (
                    <Check className="h-4 w-4 text-cyan-400" />
                  )}
                </button>
              ))}
              <p className="px-3 py-2 text-[10px] leading-4 text-amber-300/80">
                Selection is currently a UI setting. Other universes require backend support.
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((value) => !value)
              setUniverseOpen(false)
            }}
            className="relative rounded-lg border border-line bg-ink-850 p-2 text-slate-400 transition-colors hover:text-slate-200"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-ink-950">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(340px,90vw)] rounded-xl border border-line bg-ink-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    Notifications
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {unreadCount} unread
                  </div>
                </div>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-[10px] text-cyan-300 hover:text-cyan-200"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markRead(item.id)}
                    className={`flex w-full gap-3 rounded-lg p-3 text-left hover:bg-white/5 ${
                      item.read ? 'opacity-60' : 'bg-white/[0.03]'
                    }`}
                  >
                    <CircleDot className={`mt-0.5 h-4 w-4 shrink-0 ${
                      item.read ? 'text-slate-600' : 'text-cyan-400'
                    }`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-slate-200">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                        {item.message}
                      </span>
                      <span className="mt-2 block text-[10px] text-slate-600">
                        {item.time}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div
          title={userEmail || userName}
          className="flex max-w-[220px] items-center gap-2 rounded-lg border border-line bg-ink-850 py-1 pl-1 pr-2.5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent/80 to-accent-deep font-mono text-[10px] font-bold text-ink-950">
            {user ? initials : <UserRound className="h-4 w-4" />}
          </span>
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-[12px] font-medium text-slate-300">
              {userName}
            </div>
            <div className="truncate text-[10px] text-slate-500">
              {userEmail || (user ? 'Signed in' : 'Profile unavailable')}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out of your account"
          aria-label="Sign out"
          className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50 sm:px-3"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </span>
        </button>
      </div>
    </header>
  )
}