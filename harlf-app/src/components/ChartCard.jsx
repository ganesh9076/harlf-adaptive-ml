import { Card, SectionLabel } from './ui.jsx'

// Analytics panel shell: label, title, right-aligned controls, body.
export default function ChartCard({ label, title, subtitle, controls, children, className = '', bodyClass = '' }) {
  return (
    <Card className={className} hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          {label && <div className="mb-1"><SectionLabel>{label}</SectionLabel></div>}
          <h3 className="text-[14.5px] font-semibold tracking-tight text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-slate-500">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      <div className={bodyClass || 'p-5'}>{children}</div>
    </Card>
  )
}
