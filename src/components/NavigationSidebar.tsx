import React from 'react'
import { useWorkspaceStore, type WorkspaceKey } from '../state/workspaceStore'

interface NavItem {
  key: WorkspaceKey
  number: string
  label: string
  shortLabel: string
  badge?: string
  icon: (active: boolean) => React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    number: '01',
    label: 'Command Centre',
    shortLabel: 'Overview',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    )
  },
  {
    key: 'viewer',
    number: '02',
    label: '3D Studio Viewer',
    shortLabel: '3D Studio',
    badge: '3D',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: 'review',
    number: '03',
    label: 'Segmentation Review',
    shortLabel: 'Review',
    badge: 'QC',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: 'research',
    number: '04',
    label: 'Research Lab',
    shortLabel: 'Cohort',
    badge: '10 Cases',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M6 3v12a4 4 0 008 0V3M4 3h12M10 15v6M7 21h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: 'trust',
    number: '05',
    label: 'Trust & Explainability',
    shortLabel: 'Trust',
    badge: 'Flip-TTA',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    )
  },
  {
    key: 'patient',
    number: '06',
    label: 'Patient Companion',
    shortLabel: 'Patient',
    badge: 'Clear',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  },
  {
    key: 'learn',
    number: '07',
    label: 'NeuroLearn Academy',
    shortLabel: 'Learn',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    )
  },
  {
    key: 'graph',
    number: '★',
    label: 'Research Graph',
    shortLabel: 'Graph',
    badge: 'DAG',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <path d="M8.5 7.5l7 7M15.5 7.5l-7 7M6 9v6" strokeLinecap="round" />
      </svg>
    )
  }
]

export default function NavigationSidebar() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-edge bg-panel/90 text-slate-300">
      <div className="flex items-center gap-2 border-b border-edge/80 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/10 text-sky-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
          Workspaces
        </span>
        <span className="ml-auto rounded border border-edge/60 bg-panel-2 px-1 py-0.5 font-mono text-[9px] text-slate-500">
          v0.2.0
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeWorkspace === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveWorkspace(item.key)}
              className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[11.5px] transition-all ${
                isActive
                  ? 'border border-sky-500/30 bg-sky-500/10 font-medium text-sky-200 shadow-sm shadow-sky-950/40'
                  : 'border border-transparent text-slate-400 hover:border-edge/50 hover:bg-white/[0.03] hover:text-slate-200'
              }`}
            >
              <span
                className={`font-mono text-[9px] transition-colors ${
                  isActive ? 'text-sky-400 font-bold' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              >
                {item.number}
              </span>

              <span
                className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                  isActive
                    ? 'text-sky-300'
                    : 'text-slate-500 group-hover:text-slate-300'
                }`}
              >
                {item.icon(isActive)}
              </span>

              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span
                  className={`ml-auto shrink-0 rounded px-1.5 py-[1px] font-mono text-[8.5px] font-medium ${
                    isActive
                      ? 'border border-sky-400/30 bg-sky-400/20 text-sky-200'
                      : 'border border-edge/60 bg-panel-2 text-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* System Status Footnote */}
      <div className="border-t border-edge/70 p-3">
        <div className="rounded-md border border-edge/60 bg-panel-2/40 p-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-slate-300">MONAI SegResNet</span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Pinned
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span>Inference: CPU/T4</span>
            <span className="text-slate-400">17/17 tests pass</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-edge/40 pt-1.5 text-[9px] text-slate-500">
            <span>Storage: Local Zero-Cloud</span>
            <span className="text-slate-400">CC-BY-SA 4.0</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
