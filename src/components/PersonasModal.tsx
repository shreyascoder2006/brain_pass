import { useState } from 'react'
import { PATIENT_PERSONAS, type PatientPersona } from '../lib/personas'
import { useWorkspaceStore } from '../state/workspaceStore'
import { useLiveStudy } from '../state/liveStudy'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PersonasModal({ open, onClose }: Props) {
  const selectedStudyId = useWorkspaceStore((s) => s.selectedStudyId)
  const setSelectedStudyId = useWorkspaceStore((s) => s.setSelectedStudyId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const resetLiveStudy = useLiveStudy((s) => s.reset)

  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')

  if (!open) return null

  const filteredPersonas = PATIENT_PERSONAS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.anatomicalLocation.toLowerCase().includes(search.toLowerCase()) ||
      p.lesionType.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.primarySymptom.toLowerCase().includes(search.toLowerCase())

    const matchesGrade =
      filterGrade === 'all' ||
      (filterGrade === 'high' && p.whoGrade === 'Grade IV') ||
      (filterGrade === 'low' && (p.whoGrade === 'Grade II' || p.whoGrade === 'Grade III')) ||
      (filterGrade === 'control' && p.whoGrade === 'Non-Neoplastic')

    return matchesSearch && matchesGrade
  })

  const handleSelectPersona = (persona: PatientPersona) => {
    // Reset any live backend study so the procedural persona generator takes effect
    resetLiveStudy()
    setSelectedStudyId(persona.id)
    setActiveWorkspace('viewer')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-sky-500/30 bg-[#0b121e] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-edge bg-panel px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">
                  Patient Personas Directory
                </h2>
                <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-sky-300 border border-sky-500/30">
                  10 Clinical Cohort Cases
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Each persona features 4 synchronized 2D MRI sequences (T1, T1Gd, T2, FLAIR) and a unique 3D anatomical digital twin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100 transition"
            title="Close (Esc)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge/80 bg-panel-2/60 px-5 py-2.5">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by patient name, location (e.g. Frontal, Temporal), lesion type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-edge bg-panel px-3 py-1.5 pl-8 text-[11.5px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-sky-500/70"
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All (10)' },
              { id: 'high', label: 'Grade IV (High)' },
              { id: 'low', label: 'Grade II / III' },
              { id: 'control', label: 'Control / Baseline' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterGrade(f.id)}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filterGrade === f.id
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Personas Cards Scroll Area */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPersonas.map((persona) => {
            const isSelected = selectedStudyId === persona.id

            return (
              <div
                key={persona.id}
                onClick={() => handleSelectPersona(persona)}
                className={`group relative flex flex-col justify-between rounded-lg border p-4 transition cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-950/25 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/50'
                    : 'border-edge bg-panel/60 hover:border-slate-500 hover:bg-panel-2/60'
                }`}
              >
                <div>
                  {/* Top Header of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-[12px] shadow-sm ${
                          persona.gender === 'Female'
                            ? 'bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {persona.name.split(' ').map((n) => n[0]).join('')}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-semibold text-slate-100 group-hover:text-sky-300 transition">
                            {persona.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {persona.age}y · {persona.gender}
                          </span>
                        </div>
                        <span className="font-mono text-[9.5px] text-slate-500">{persona.mrn}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[9.5px] font-semibold ${
                          persona.whoGrade === 'Grade IV'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : persona.whoGrade === 'Grade III'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : persona.whoGrade === 'Grade II'
                            ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {persona.whoGrade}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-sky-400 uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
                          ACTIVE IN STUDIO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Anatomical Classification & Lesion Type */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="rounded bg-sky-500/10 px-2 py-0.5 font-medium text-sky-200 border border-sky-500/20">
                      📍 {persona.anatomicalLocation}
                    </span>
                    <span className="rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-200 border border-purple-500/20">
                      {persona.lesionType}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">
                      {persona.estimatedVolumeMl > 0 ? `${persona.estimatedVolumeMl.toFixed(1)} mL` : '0.0 mL (Clear)'}
                    </span>
                  </div>

                  {/* Clinical Presentation & Symptoms */}
                  <p className="mt-2.5 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
                    <strong className="text-slate-300 font-medium">Chief Complaint:</strong> {persona.primarySymptom}
                  </p>
                </div>

                {/* Bottom Bar of Card */}
                <div className="mt-3.5 flex items-center justify-between border-t border-edge/60 pt-2.5 text-[10.5px]">
                  <div className="flex items-center gap-1 font-mono text-[9.5px] text-slate-500">
                    <span className="text-slate-600 font-sans">4 MRI Sequences:</span>
                    <span className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">T1</span>
                    <span className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">T1Gd</span>
                    <span className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">T2</span>
                    <span className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">FLAIR</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectPersona(persona)
                    }}
                    className={`rounded px-3 py-1 font-medium text-[11px] transition ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/50'
                        : 'border border-edge bg-panel-2 text-slate-300 hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200'
                    }`}
                  >
                    {isSelected ? 'Viewing Now →' : 'Load 3D Twin & 2D Scans'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-edge bg-panel px-5 py-3 text-[11px] text-slate-500">
          <span>Click any persona card to instantly re-mesh their 3D digital twin and refresh the 2D cross-sectional slice viewers.</span>
          <button
            onClick={onClose}
            className="rounded border border-edge bg-panel-2 px-3 py-1 text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
