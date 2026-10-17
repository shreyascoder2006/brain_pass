import React from 'react'
import { useStore } from '../state/store'
import { useWorkspaceStore, type WorkspaceKey } from '../state/workspaceStore'

interface NavItem {
  key: WorkspaceKey
  label: string
  badge?: string
  hasChevron?: boolean
  icon: (active: boolean) => React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Command Centre',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    key: 'viewer',
    label: '3D Studio Viewer',
    hasChevron: true,
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: 'review',
    label: 'Segmentation Review',
    hasChevron: true,
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    )
  },
  {
    key: 'research',
    label: 'Research Lab',
    badge: '10 Cases',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M6 3v12a4 4 0 008 0V3M4 3h12M10 15v6M7 21h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: 'trust',
    label: 'Trust & Explainability',
    badge: 'FLIP-TTA',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    )
  },
  {
    key: 'patient',
    label: 'Patient Comparison',
    badge: 'Clear',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    )
  },
  {
    key: 'learn',
    label: 'NeuroLearn Academy',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="h-4 w-4">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    )
  },
  {
    key: 'graph',
    label: 'Research Graph',
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#263854] bg-[#0a1020] text-slate-300">
      {/* Workspaces Title Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#1b293d]">
        <svg viewBox="0 0 24 24" fill="none" stroke="#32d5ff" strokeWidth={2.4} className="h-3.5 w-3.5">
          <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
        </svg>
        <span className="text-[10.5px] font-bold tracking-[0.14em] text-[#a4b5ce] uppercase">
          Workspaces
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activeWorkspace === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveWorkspace(item.key)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#1a56db] to-[#2563eb] text-white shadow-md shadow-[#1a56db]/40'
                  : 'text-[#a4b5ce] hover:bg-[#101a2b] hover:text-white'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
                  isActive ? 'text-white' : 'text-[#7588a5] group-hover:text-[#32d5ff]'
                }`}
              >
                {item.icon(isActive)}
              </span>

              <span className="truncate flex-1">{item.label}</span>

              {item.badge && (
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'border border-[#263854] bg-[#101a2b] text-[#7588a5]'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.hasChevron && (
                <span className={`text-[12px] transition-transform ${isActive ? 'text-white' : 'text-[#7588a5]'}`}>
                  ›
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Patient Personas Launcher Pill */}
      <div className="px-3 pb-2">
        <button
          onClick={() => useStore.getState().setPersonasOpen(true)}
          className="w-full flex items-center justify-between rounded-lg border border-[#3478ff]/40 bg-[#101a2b] px-3 py-2 text-[11px] font-medium text-[#32d5ff] transition hover:bg-[#152238] hover:border-[#32d5ff] shadow-sm shadow-[#3478ff]/10"
        >
          <span className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-[#f1f6ff] font-semibold">Patient Personas</span>
          </span>
          <span className="rounded bg-[#3478ff]/20 px-1.5 py-0.5 font-mono text-[9px] text-[#32d5ff] border border-[#3478ff]/40">
            10 Mapped
          </span>
        </button>
      </div>

      {/* System Status Footnote matching UI Sample 2 */}
      <div className="border-t border-[#1b293d] p-3 bg-[#070b16]">
        <div className="rounded-lg border border-[#263854] bg-[#0a1020] p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-200">MONAI SegResNet</span>
            <span className="flex items-center gap-1 font-mono text-[9.5px] font-semibold text-[#10b981]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
              Online
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-[#7588a5]">
            <span>Inference: CUDA</span>
            <span className="text-slate-300">17/17 tasks pass</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#263854]/60 pt-1.5 font-mono text-[9px] text-[#7588a5]">
            <span>Storage: Local Zero-Cloud</span>
            <span className="text-slate-400">C: 8V 54.4G</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

