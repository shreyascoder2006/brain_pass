import { PATIENT_PERSONAS } from '../lib/personas'
import { useLiveStudy } from '../state/liveStudy'
import { useStudyOptional } from '../state/study'
import { useStore } from '../state/store'
import { useWorkspaceStore } from '../state/workspaceStore'

export default function TopBar() {
  // Always null here — TopBar sits outside every <StudyProvider>, which only
  // wraps the viewer/review/trust workspaces. Only use it for the case label
  // (best-effort, fine if it's null); the Report button must not depend on it
  // or it can never enable from here. ReportModal lives inside the provider
  // and reads the real bundle itself.
  const bundle = useStudyOptional()
  const setUploadOpen = useStore((s) => s.setUploadOpen)
  const setDatasetsOpen = useStore((s) => s.setDatasetsOpen)
  const setPersonasOpen = useStore((s) => s.setPersonasOpen)
  const setReportOpen = useStore((s) => s.setReportOpen)
  const setWhatsappOpen = useStore((s) => s.setWhatsappOpen)
  const reset = useLiveStudy((s) => s.reset)
  const runSample = useLiveStudy((s) => s.runSample)

  const selectedStudyId = useWorkspaceStore((s) => s.selectedStudyId)
  const setSelectedStudyId = useWorkspaceStore((s) => s.setSelectedStudyId)

  const handleStudyChange = (studyId: string) => {
    if (studyId.startsWith('persona_') || studyId === 'demo_phantom') {
      reset()
      setSelectedStudyId(studyId === 'demo_phantom' ? 'persona_01_sarah' : studyId)
    } else {
      setSelectedStudyId(studyId)
      runSample(studyId)
    }
  }

  const currentCaseLabel = bundle?.study.persona
    ? `${bundle.study.persona.name} (${bundle.study.persona.age}y ${bundle.study.persona.gender[0]})`
    : selectedStudyId === 'brats_449'
    ? 'Decathlon BRATS_449'
    : selectedStudyId

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#263854] bg-[#0a1020] px-4 text-slate-200">
      {/* Brand & Studio Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => useWorkspaceStore.getState().setActiveWorkspace('landing')}
          title="Return to Tumor Lens Neural Journey 3D Landing Page"
          className="flex items-center gap-2 transition hover:opacity-85 cursor-pointer text-left"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3478ff] to-[#32d5ff] shadow-md shadow-[#3478ff]/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="#05070d" strokeWidth={2.4} className="h-4 w-4">
              <path
                d="M12 4a4 4 0 00-4 4 3 3 0 00-1 5.8V16a3 3 0 003 3h4a3 3 0 003-3v-2.2A3 3 0 0016 8a4 4 0 00-4-4z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">
            NeuroScope <span className="text-[#32d5ff]">3D</span>
          </span>
        </button>

        <button
          onClick={() => useWorkspaceStore.getState().setActiveWorkspace('landing')}
          title="View Tumor Lens Neural Journey 3D Landing Page"
          className="rounded border border-[#32d5ff]/40 bg-[#32d5ff]/15 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#32d5ff] transition hover:bg-[#32d5ff]/25"
        >
          🌟 3D Journey
        </button>

        <span className="rounded border border-[#263854] bg-[#101a2b] px-2 py-0.5 font-mono text-[9.5px] text-[#7588a5]">
          Studio v2.8.0
        </span>

        {/* Case Selector Dropdown matching UI Sample 2 */}
        <div className="relative ml-2 flex items-center">
          <select
            value={bundle?.study.caseId ?? selectedStudyId}
            onChange={(e) => handleStudyChange(e.target.value)}
            className="appearance-none rounded-md border border-[#263854] bg-[#101a2b] py-1.5 pl-3 pr-7 text-[11.5px] font-medium text-[#f1f6ff] transition hover:border-[#3478ff] focus:border-[#32d5ff] focus:outline-none cursor-pointer"
          >
            <optgroup label="Clinical Patient Personas (10 Digital Twins)">
              {PATIENT_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  Case: {p.name} ({p.age}y {p.gender[0]}) — {p.lesionType}
                </option>
              ))}
            </optgroup>
            <optgroup label="Server Decathlon Cases">
              <option value="brats_449">Case: Decathlon BRATS_449</option>
              <option value="brats_206">Case: Decathlon BRATS_206</option>
              <option value="brats_306">Case: Decathlon BRATS_306</option>
              <option value="brats_457">Case: Decathlon BRATS_457</option>
            </optgroup>
          </select>
          <span className="pointer-events-none absolute right-2 text-[10px] text-[#7588a5]">▾</span>
        </div>

        {/* Active Model & Execution Mode */}
        <div className="hidden items-center gap-2 rounded-md border border-[#263854] bg-[#101a2b] px-2.5 py-1 text-[11px] lg:flex">
          <span className="text-[#7588a5]">Run:</span>
          <span className="font-semibold text-slate-200">SegResNet (BraTS-18)</span>
          <span className="rounded bg-[#32d5ff]/15 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#32d5ff] border border-[#32d5ff]/30">
            2-Pass TTA
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setDatasetsOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-[#263854] bg-[#101a2b] px-3 py-1.5 text-[11px] font-medium text-[#a4b5ce] transition hover:border-[#3478ff] hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Datasets Gallery</span>
        </button>

        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#3478ff] px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-[#3478ff]/30 transition hover:bg-[#2563eb]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <span>Upload Case</span>
        </button>

        <button
          onClick={() => setReportOpen(true)}
          title="Open report — a live study opens its backend provenance report; a persona case opens a generated report"
          className="flex items-center gap-1.5 rounded-md border border-[#263854] bg-[#101a2b] px-3 py-1.5 text-[11px] font-medium text-[#a4b5ce] transition hover:border-[#3478ff] hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
          <span>Report</span>
        </button>

        <button
          onClick={() => setWhatsappOpen(true)}
          title="Open WhatsApp Clinic Bridge — Pair QR Code & Dispatch Reports"
          className="flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-[#06261c] px-3 py-1.5 text-[11px] font-semibold text-emerald-300 shadow-md shadow-emerald-950/40 transition hover:bg-emerald-900/60 hover:border-emerald-400 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-emerald-400">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
          </svg>
          <span>WhatsApp Clinic</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* User Avatar Circle */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3478ff]/50 bg-[#152238] font-mono text-[10.5px] font-bold text-[#32d5ff] shadow-sm shadow-[#3478ff]/20"
          title="Lead Radiologist / Investigator"
        >
          AD
        </div>
      </div>
    </header>
  )
}

