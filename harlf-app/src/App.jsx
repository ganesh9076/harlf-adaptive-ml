import { useEffect, useState } from 'react'
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'

import Login from './pages/Login.jsx'
import { fetchSession } from './auth.js'

import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar.jsx'
import Navbar from './components/Navbar.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import { ToastProvider } from './hooks.jsx'

import Dashboard from './pages/Dashboard.jsx'
import MarketData from './pages/MarketData.jsx'
import AssetExplorer from './pages/AssetExplorer.jsx'
import MLModels from './pages/MLModels.jsx'
import ModelArena from './pages/ModelArena.jsx'
import MetaSelector from './pages/MetaSelector.jsx'
import Forecast from './pages/Forecast.jsx'
import Optimizer from './pages/Optimizer.jsx'
import Allocation from './pages/Allocation.jsx'
import Performance from './pages/Performance.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'

import UserAgreement from './pages/UserAgreement.jsx'
import { getAgreementStatus } from './api/services.js'


// Checks authentication and stores the logged-in user.

function RequireAuth({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('checking')
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    async function checkAccess() {
      setStatus('checking')
      setAuthError('')

      try {
        const sessionUser = await fetchSession()

        if (!active) return

        if (!sessionUser) {
          setUser(null)
          setStatus('out')
          return
        }

        setUser(sessionUser)

        const agreement = await getAgreementStatus()

        if (!active) return

        setStatus(agreement.required ? 'agreement' : 'in')
      } catch (error) {
        if (!active) return

        console.error('Unable to check access:', error)
        setAuthError(
          error.message || 'Unable to verify your session. Please try again.'
        )
        setStatus('error')
      }
    }

    checkAccess()

    return () => {
      active = false
    }
  }, [location.pathname])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b12] text-slate-300">
        Verifying session and agreement…
      </div>
    )
  }

  if (status === 'out') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#080b12] p-6 text-center text-slate-200">
        <p>{authError}</p>
          <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
        >
          Retry
        </button>
      </div>
    )
  }

  if (status === 'agreement') {
    return (
      <UserAgreement
        onAccepted={() => setStatus('in')}
      />
    )
  }

  return (
    <>
      {typeof children === 'function' ? children(user) : children}
    </>
  )
}


// Main application layout.
function Shell({ user }) {
  const location = useLocation()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const onKey = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="min-h-screen bg-ink-900">
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">

        {/* Pass the authenticated user's details to the navbar. */}
        <Navbar
          path={location.pathname}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          user={user}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                duration: 0.22,
                ease: 'easeOut',
              }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/market" element={<MarketData />} />
                <Route path="/explorer" element={<AssetExplorer />} />
                <Route path="/models" element={<MLModels />} />
                <Route path="/arena" element={<ModelArena />} />
                <Route path="/meta" element={<MetaSelector />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/optimizer" element={<Optimizer />} />
                <Route path="/allocation" element={<Allocation />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 pb-2">
            <span className="font-mono text-[9.5px] tracking-wide text-slate-600">
              HARLF · ADAPTIVE ML PORTFOLIO INTELLIGENCE — “From market signals to adaptive allocation.”
            </span>

            <span className="font-mono text-[9.5px] text-slate-600">
              SIMULATED DEMO DATA · v1.0.0
            </span>
          </footer>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  )
}


// Application entry point.
export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/*"
            element={
              <RequireAuth>
                {(user) => <Shell user={user} />}
              </RequireAuth>
            }
          />
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}
