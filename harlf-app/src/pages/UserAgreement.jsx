
import { useState } from 'react'
import { motion } from 'framer-motion'
import { acceptAgreement } from '../api/services.js'

const sections = [
  {
    title: '1. Purpose and Scope',
    text: 'HARLF is an educational and analytical platform designed to demonstrate machine-learning-based market analysis, forecasting, model comparison, and portfolio optimization. Its outputs are intended to support research and decision-making, not to replace independent financial judgment.'
  },
  {
    title: '2. No Investment Advice',
    text: 'HARLF does not provide personalized investment, legal, tax, or financial advice. Forecasts, model rankings, portfolio allocations, and risk indicators are informational outputs only. They are not recommendations to buy, hold, or sell any security.'
  },
  {
    title: '3. Model Accuracy and Limitations',
    text: 'Machine-learning models learn from historical data and assumptions. Their predictions can be inaccurate, incomplete, delayed, or affected by changing market conditions. Past performance and historical patterns do not guarantee future results.'
  },
  {
    title: '4. Market Data and Third-Party Sources',
    text: 'Market information may be obtained from external data providers and may contain delays, gaps, adjustments, or inaccuracies. HARLF does not guarantee that all displayed prices, indicators, or historical records are complete or current.'
  },
  {
    title: '5. Portfolio Optimization and Risk',
    text: 'Portfolio allocations and risk metrics depend on the selected assets, historical observations, model assumptions, and optimization settings. Actual investment returns may differ significantly, and losses, including substantial losses, are possible.'
  },
  {
    title: '6. User Responsibility',
    text: 'You are responsible for independently reviewing outputs, verifying relevant information, and making your own decisions. Do not rely solely on HARLF for financial decisions. Consult a qualified financial professional when appropriate.'
  },
  {
    title: '7. Account Security and Privacy',
    text: 'You are responsible for maintaining the security of your account credentials. Account information should be handled according to the platform’s applicable privacy practices. Do not enter passwords, payment details, or other unnecessary sensitive information into analytical inputs.'
  },
  {
    title: '8. Availability and Changes',
    text: 'Features, model availability, data sources, and results may change or become temporarily unavailable. HARLF is provided on an as-available basis, subject to applicable law and any separate terms that govern your use of the platform.'
  }
]

export default function UserAgreement({ onAccepted }) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!checked || loading) return

    setLoading(true)
    setError('')

    try {
      await acceptAgreement()
      onAccepted()
    } catch (err) {
      setError(err.message || 'Unable to save your acceptance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-wide">
              HARLF<span className="text-cyan-400">.</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ADAPTIVE ML PORTFOLIO OPTIMIZATION
            </p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
            Review required
          </span>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101621] shadow-2xl"
        >
          <div className="border-b border-slate-800 p-6 sm:p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Before you continue
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              User Agreement & Risk Disclosure
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Please review the terms below. You must acknowledge the
              platform's purpose, limitations, and financial risks before
              accessing the dashboard.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="rounded-lg bg-slate-800 px-3 py-2">
                Agreement version 1.0
              </span>
              <span className="rounded-lg bg-slate-800 px-3 py-2">
                Educational & analytical use
              </span>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-6 overflow-y-auto p-6 sm:p-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 text-sm font-semibold text-slate-100">
                  {section.title}
                </h2>
                <p className="text-sm leading-6 text-slate-400">
                  {section.text}
                </p>
              </section>
            ))}

            <p className="border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
              This disclosure is a general platform notice and is not a
              substitute for legal review or a complete set of legally
              binding terms.
            </p>
          </div>

          <div className="border-t border-slate-800 bg-[#0c111a] p-6 sm:p-8">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span className="text-sm leading-6 text-slate-300">
                I have read and understood the User Agreement and Risk
                Disclosure. I understand that HARLF provides analytical
                outputs for informational purposes and that investment
                decisions involve risk.
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!checked || loading}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Saving acceptance…' : 'Accept & Continue to Dashboard'}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Your acceptance is saved to your account.
            </p>
          </div>
        </motion.section>

        <p className="mt-5 text-center text-xs text-slate-600">
          HARLF · Machine-learning-powered market analytics
        </p>
      </div>
    </div>
  )
}
