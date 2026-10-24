import { Link } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-28 text-center">
      <Logo size={42} />
      <div className="num text-[15px] font-semibold text-slate-300">404 · Workspace not found</div>
      <p className="max-w-xs text-[12px] text-slate-500">The route you requested does not exist in the HARLF navigation graph.</p>
      <Link to="/" className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-[12.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/15">
        Return to Dashboard
      </Link>
    </div>
  )
}
