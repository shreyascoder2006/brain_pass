import { useState } from 'react'
import { useStore } from '../../state/store'
import { useStudyOptional } from '../../state/study'
import {
  useWorkspaceStore,
  type ErrorCategory,
  type ReviewDisposition,
  type FlaggedCluster
} from '../../state/workspaceStore'

const COMPARISON_MODES = [
  { id: 'disagreement', label: 'Disagreement Map (TP/FP/FN)', desc: 'Green: Agreement, Amber: Model Only (FP), Red: Expert Only (FN)' },
  { id: 'segmentation', label: 'Prediction Only', desc: 'Render model segmentation only' },
  { id: 'expert', label: 'Expert Annotation Only', desc: 'Render ground truth only' },
  { id: 'blended', label: 'Blended Cross-Compare', desc: 'Dual opacity alpha blending' }
] as const

const ERROR_CATEGORIES: { id: ErrorCategory; label: string }[] = [
  { id: 'none', label: 'None / Normal Variation' },
  { id: 'infiltrative_boundary', label: 'Infiltrative Boundary Ambiguity' },
  { id: 'edema_oversegmentation', label: 'Peritumoral Edema Spill (FP)' },
  { id: 'necrotic_misclassification', label: 'Central Necrosis Under-prediction (FN)' },
  { id: 'skullstrip_artifact', label: 'Skull-Strip / Cortical Edge Artifact' },
  { id: 'low_contrast_miss', label: 'Non-enhancing Rim Miss' }
]

export default function ReviewWorkspace() {
  const bundle = useStudyOptional()
  const overlayMode = useStore((s) => s.overlayMode)
  const setOverlayMode = useStore((s) => s.setOverlayMode)
  const maskSource = useStore((s) => s.maskSource)
  const setMaskSource = useStore((s) => s.setMaskSource)
  const voxel = useStore((s) => s.voxel)
  const setVoxel = useStore((s) => s.setVoxel)

  const selectedStudyId = useWorkspaceStore((s) => s.selectedStudyId)
  const reviews = useWorkspaceStore((s) => s.reviews)
  const setReviewDisposition = useWorkspaceStore((s) => s.setReviewDisposition)
  const setReviewNotes = useWorkspaceStore((s) => s.setReviewNotes)
  const setReviewCategory = useWorkspaceStore((s) => s.setReviewCategory)
  const addFlaggedCluster = useWorkspaceStore((s) => s.addFlaggedCluster)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  const caseKey = (bundle?.study.caseId || selectedStudyId).toLowerCase()
  const currentReview = reviews[caseKey] || {
    disposition: 'pending' as ReviewDisposition,
    notes: '',
    errorCategory: 'none' as ErrorCategory,
    flaggedClusters: [],
    reviewedAt: null,
    reviewerId: 'RAD-INVESTIGATOR-01'
  }

  const [notesInput, setNotesInput] = useState(currentReview.notes)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleSave = () => {
    setReviewNotes(caseKey, notesInput)
    setSaveStatus('Audit record saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  // Sample error clusters for review investigation
  const errorClusters: FlaggedCluster[] = [
    {
      id: 'cluster-1',
      label: 'Medial boundary false-negative gap',
      region: 'ET',
      voxel: [84, 112, 78],
      volumeMl: 1.57,
      type: 'FN',
      note: 'Model omitted narrow enhancing margin near ventricle'
    },
    {
      id: 'cluster-2',
      label: 'Posterior edema false-positive island',
      region: 'WT',
      voxel: [98, 88, 92],
      volumeMl: 2.14,
      type: 'FP',
      note: 'Elevated T2 hyperintensity captured as edema'
    },
    {
      id: 'cluster-3',
      label: 'Satellite core concordance check',
      region: 'TC',
      voxel: [76, 102, 85],
      volumeMl: 0.82,
      type: 'FN',
      note: 'Isolated rater island not joined to main core'
    }
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4 bg-ink text-slate-200">
      {/* Header */}
      <div className="flex flex-col gap-2 rounded-lg border border-edge bg-panel/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-slate-100">Segmentation Review & Error Explorer</h1>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium border ${
                currentReview.disposition === 'accepted'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : currentReview.disposition === 'flagged'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-500/10 text-slate-400 border-edge'
              }`}
            >
              Disposition: {currentReview.disposition.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">
            Audit case: <span className="font-mono text-slate-200">{bundle?.study.caseId || selectedStudyId}</span> ·
            Cross-examine model boundaries against expert ground truth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveWorkspace('viewer')}
            className="rounded border border-edge bg-panel-2 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            ← View in 3D Studio
          </button>
          <button
            onClick={() => setActiveWorkspace('trust')}
            className="rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
          >
            Audit Trust & Explainability →
          </button>
        </div>
      </div>

      {/* Main Grid: Comparison Controls + Error Clusters + Disposition */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Column: Overlay & Comparison Modes (1 Col) */}
        <div className="space-y-4">
          <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3">
            <h2 className="text-[13px] font-semibold text-slate-100">Comparison Display Mode</h2>
            <div className="space-y-2">
              {COMPARISON_MODES.map((mode) => {
                const isSelected =
                  (mode.id === 'disagreement' && overlayMode === 'agreement') ||
                  (mode.id === 'segmentation' && overlayMode === 'segmentation' && maskSource === 'predicted') ||
                  (mode.id === 'expert' && maskSource === 'expert')

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      if (mode.id === 'disagreement') {
                        setOverlayMode('agreement')
                      } else if (mode.id === 'expert') {
                        setMaskSource('expert')
                        setOverlayMode('segmentation')
                      } else {
                        setMaskSource('predicted')
                        setOverlayMode('segmentation')
                      }
                    }}
                    className={`flex w-full flex-col rounded-md border p-2.5 text-left transition ${
                      isSelected
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-200'
                        : 'border-edge bg-panel-2/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-semibold">{mode.label}</span>
                      {isSelected && <span className="font-mono text-[9px] text-sky-400">ACTIVE</span>}
                    </div>
                    <span className="mt-1 text-[10px] text-slate-500 leading-relaxed">{mode.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Spatial Agreement Summary */}
          <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3">
            <h2 className="text-[13px] font-semibold text-slate-100">Disagreement Legend</h2>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex items-center gap-2 rounded bg-emerald-950/20 border border-emerald-500/30 p-2">
                <span className="h-2.5 w-2.5 rounded bg-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-bold">True Positive (TP)</span>
                <span className="ml-auto text-slate-400">High Confidence Hit</span>
              </div>
              <div className="flex items-center gap-2 rounded bg-amber-950/20 border border-amber-500/30 p-2">
                <span className="h-2.5 w-2.5 rounded bg-amber-400 shrink-0" />
                <span className="text-amber-300 font-bold">False Positive (FP)</span>
                <span className="ml-auto text-slate-400">Model Only Overcall</span>
              </div>
              <div className="flex items-center gap-2 rounded bg-rose-950/20 border border-rose-500/30 p-2">
                <span className="h-2.5 w-2.5 rounded bg-rose-400 shrink-0" />
                <span className="text-rose-300 font-bold">False Negative (FN)</span>
                <span className="ml-auto text-slate-400">Expert Only Miss</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Error Cluster Explorer (1 Col) */}
        <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-100">Detected Error Clusters</h2>
              <p className="text-[10px] text-slate-500">Connected component analysis of false positive / negative regions</p>
            </div>
            <span className="font-mono text-[10px] text-slate-400">3 Clusters</span>
          </div>

          <div className="space-y-2.5">
            {errorClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="rounded-md border border-edge bg-panel-2/60 p-3 space-y-2 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11.5px] text-slate-200">{cluster.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                      cluster.type === 'FN'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {cluster.type} · {cluster.region}
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-400 leading-relaxed">{cluster.note}</p>

                <div className="flex items-center justify-between border-t border-edge/60 pt-2 font-mono text-[9.5px]">
                  <span className="text-slate-500">
                    Volume: <strong className="text-slate-300">{cluster.volumeMl.toFixed(2)} mL</strong> · Coords: [{cluster.voxel.join(', ')}]
                  </span>
                  <button
                    onClick={() => {
                      setVoxel(cluster.voxel)
                      setOverlayMode('agreement')
                      setActiveWorkspace('viewer')
                    }}
                    className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-sky-300 hover:bg-sky-500/20"
                  >
                    Fly to in 3D →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Review Disposition & Audit Trail (1 Col) */}
        <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-slate-100">Review Disposition</h2>
            {currentReview.reviewedAt && (
              <span className="font-mono text-[9px] text-slate-500">
                Logged: {currentReview.reviewedAt}
              </span>
            )}
          </div>

          {/* Disposition Radio Buttons */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-400">Acceptance Decision:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['accepted', 'flagged', 'unusable'] as ReviewDisposition[]).map((disp) => {
                const isSelected = currentReview.disposition === disp
                return (
                  <button
                    key={disp}
                    onClick={() => setReviewDisposition(caseKey, disp)}
                    className={`rounded border px-2 py-1.5 text-center font-mono text-[10px] capitalize transition ${
                      isSelected
                        ? disp === 'accepted'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold'
                          : disp === 'flagged'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200 font-bold'
                          : 'border-rose-500 bg-rose-500/20 text-rose-200 font-bold'
                        : 'border-edge bg-panel-2 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {disp}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Taxonomy */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-400">Primary Error Classification:</label>
            <select
              value={currentReview.errorCategory}
              onChange={(e) => setReviewCategory(caseKey, e.target.value as ErrorCategory)}
              className="w-full rounded border border-edge bg-panel-2 px-2.5 py-1.5 text-[11px] text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {ERROR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Review Notes */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-400">Clinical Reviewer Notes & Audit Trail:</label>
            <textarea
              rows={4}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Record anatomical rationale, suspected motion artifact, or rater edge boundary ambiguities…"
              className="w-full rounded border border-edge bg-panel-2 p-2.5 text-[11px] text-slate-200 leading-relaxed focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-edge/80">
            <span className="font-mono text-[10px] text-slate-500">
              Reviewer: {currentReview.reviewerId}
            </span>
            <button
              onClick={handleSave}
              className="rounded border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
            >
              {saveStatus ? '✓ Saved' : 'Commit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
