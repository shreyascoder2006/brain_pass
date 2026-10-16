import { useStudyOptional } from '../state/study'

const NAV = ['Home', 'Datasets', 'Selection', 'Help']

export default function TopBar() {
  const bundle = useStudyOptional()

  return (
    <header className="flex shrink-0 items-center gap-6 border-b border-edge bg-panel px-4 py-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-gradient-to-br from-sky-400 to-indigo-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0b1017" strokeWidth={2.1} className="h-3.5 w-3.5">
            <path d="M12 4a4 4 0 00-4 4 3 3 0 00-1 5.8V16a3 3 0 003 3h4a3 3 0 003-3v-2.2A3 3 0 0016 8a4 4 0 00-4-4z"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-[14px] font-semibold tracking-tight text-slate-100">
          NeuroScope<span className="text-sky-400"> 3D</span>
        </span>
        <span className="hidden rounded border border-edge px-1.5 py-[1px] font-mono text-[9px] text-slate-500 lg:inline">
          v0.1.0-prototype
        </span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map((n, i) => (
          <button
            key={n}
            className={`rounded px-2.5 py-1 text-[11.5px] transition ${i === 0 ? 'bg-white/5 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {n}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {bundle && (
          <span className="hidden items-center gap-1.5 font-mono text-[10px] text-slate-500 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-ring" />
            {bundle.study.caseId}
          </span>
        )}
        <button className="rounded border border-edge px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-slate-100">
          Download report
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-edge bg-panel-2 text-[10px] font-semibold text-slate-400">
          IS
        </span>
      </div>
    </header>
  )
}
