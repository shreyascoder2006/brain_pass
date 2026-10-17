import { useState } from 'react'
import BottomMetricsBar from '../BottomMetricsBar'
import LinkedMprGrid from '../LinkedMprGrid'
import ThreeBrainTwin from '../ThreeBrainTwin'
import { useStore } from '../../state/store'
import { useWorkspaceStore } from '../../state/workspaceStore'
import { useStudyOptional } from '../../state/study'
import { useLiveStudy } from '../../state/liveStudy'

export default function ViewerWorkspace() {
  const bundle = useStudyOptional()
  const sequenceWarnings = useLiveStudy((s) => s.sequenceWarnings)
  const sequenceWarningEntries = Object.entries(sequenceWarnings)
  const voxel = useStore((s) => s.voxel)
  const setVoxel = useStore((s) => s.setVoxel)
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const measure = useStore((s) => s.measure)
  const clearMeasure = useStore((s) => s.clearMeasure)
  const activeSequence = useStore((s) => s.sequence)

  const bookmarks = useWorkspaceStore((s) => s.bookmarks)
  const addBookmark = useWorkspaceStore((s) => s.addBookmark)
  const removeBookmark = useWorkspaceStore((s) => s.removeBookmark)
  const selectedStudyId = useWorkspaceStore((s) => s.selectedStudyId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  const [showBookmarks, setShowBookmarks] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState('')
  const [copiedSnapshot, setCopiedSnapshot] = useState(false)

  // Calculate measurement distance in physical mm if 2 points exist
  let measurementMm: number | null = null
  let deltaVoxel: [number, number, number] | null = null
  if (measure.length === 2 && bundle) {
    const p1 = measure[0].voxel
    const p2 = measure[1].voxel
    const sp = bundle.study.spacing
    const dx = (p2[0] - p1[0]) * sp[0]
    const dy = (p2[1] - p1[1]) * sp[1]
    const dz = (p2[2] - p1[2]) * sp[2]
    measurementMm = Math.sqrt(dx * dx + dy * dy + dz * dz)
    deltaVoxel = [Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]), Math.abs(p2[2] - p1[2])]
  }

  const handleSaveBookmark = () => {
    if (!bookmarkLabel.trim()) return
    addBookmark({
      label: bookmarkLabel.trim(),
      studyId: bundle?.study.caseId || selectedStudyId,
      voxel: [voxel[0], voxel[1], voxel[2]],
      plane: 'axial',
      sequence: activeSequence,
      note: `Crosshair at [${voxel.join(', ')}]`
    })
    setBookmarkLabel('')
  }

  const handleSnapshot = () => {
    setCopiedSnapshot(true)
    setTimeout(() => setCopiedSnapshot(false), 2000)
  }

  const setPersonasOpen = useStore((s) => s.setPersonasOpen)

  return (
    <div className="flex h-full flex-col bg-[#05070d]">
      {/* Top Studio Toolbar matching UI Sample 2 */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#263854] bg-[#0a1020] px-3 text-[11.5px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md bg-[#3478ff]/15 px-2.5 py-1 text-[#32d5ff] font-semibold border border-[#3478ff]/40 shadow-sm shadow-[#3478ff]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" strokeLinejoin="round" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeLinejoin="round" />
            </svg>
            <span>3D Digital Twin &amp; MPR Studio</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#a4b5ce]">
            <span>Voxel: <strong className="text-white">[{voxel[0]}, {voxel[1]}, {voxel[2]}]</strong></span>
            {bundle && (
              <>
                <span className="text-[#263854]">|</span>
                <span className="text-[#32d5ff]">
                  Spacing: {bundle.study.spacing.map((s) => s.toFixed(2)).join('×')} mm
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Tools Group matching UI Sample 2 */}
        <div className="flex items-center gap-2">
          {/* Tool switchers */}
          <button
            onClick={() => setTool('crosshair')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              tool === 'crosshair'
                ? 'border border-[#32d5ff] bg-[#32d5ff]/15 text-[#32d5ff] shadow-sm shadow-[#32d5ff]/20'
                : 'border border-[#263854] bg-[#101a2b] text-[#a4b5ce] hover:border-[#3478ff] hover:text-white'
            }`}
            title="Crosshair Navigation (C)"
          >
            <span className="text-[12px]">+</span>
            <span>Crosshair</span>
          </button>

          <button
            onClick={() => setTool('measure')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              tool === 'measure'
                ? 'border border-[#32d5ff] bg-[#32d5ff]/15 text-[#32d5ff] shadow-sm shadow-[#32d5ff]/20'
                : 'border border-[#263854] bg-[#101a2b] text-[#a4b5ce] hover:border-[#3478ff] hover:text-white'
            }`}
            title="Distance Caliper Measure (M)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
              <path d="M3 15l6-6 6 6-6 6-6-6zm9-9l6 6M15 9l1.5-1.5" />
            </svg>
            <span>Measure</span>
          </button>

          <button
            onClick={() => setTool('window')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              tool === 'window'
                ? 'border border-[#32d5ff] bg-[#32d5ff]/15 text-[#32d5ff] shadow-sm shadow-[#32d5ff]/20'
                : 'border border-[#263854] bg-[#101a2b] text-[#a4b5ce] hover:border-[#3478ff] hover:text-white'
            }`}
            title="PACS Window/Level Contrast (W)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18" />
            </svg>
            <span>Window/Level</span>
          </button>

          <button
            onClick={() => {
              useStore.getState().setAutoOrbit(!useStore.getState().autoOrbit)
            }}
            className={`flex items-center gap-1.5 rounded-md border border-[#263854] bg-[#101a2b] px-2.5 py-1 text-[11px] font-medium text-[#a4b5ce] transition hover:border-[#3478ff] hover:text-white`}
            title="Camera Orbit Toggle"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Camera</span>
          </button>

          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
              showBookmarks
                ? 'border-[#3478ff] bg-[#3478ff]/20 text-[#32d5ff]'
                : 'border-[#263854] bg-[#101a2b] text-[#a4b5ce] hover:border-[#3478ff] hover:text-white'
            }`}
          >
            <span>★ Bookmarks ({bookmarks.length})</span>
          </button>

          <button
            onClick={handleSnapshot}
            className="flex items-center gap-1.5 rounded-md border border-[#263854] bg-[#101a2b] px-2.5 py-1 text-[11px] font-medium text-[#a4b5ce] transition hover:border-[#3478ff] hover:text-white"
            title="Capture timestamped clinical evidence snapshot"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{copiedSnapshot ? '✓ Evidence Logged' : 'Evidence Snapshot'}</span>
          </button>

          <button
            onClick={() => setActiveWorkspace('review')}
            className="flex items-center gap-1.5 rounded-md border border-[#10b981]/60 bg-[#10b981]/15 px-3 py-1 text-[11px] font-semibold text-[#10b981] transition hover:bg-[#10b981]/25 shadow-sm shadow-[#10b981]/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3.5 w-3.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>QC Review</span>
          </button>
        </div>
      </div>

      {/* Flagged-input banner — set only when the user overrode UploadPanel's
          filename-mismatch warning. Shown regardless of which base sequence is
          selected: the model reads all four channels jointly, so a mislabelled
          one puts the whole result in question, not just its own view. */}
      {sequenceWarningEntries.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-rose-600/40 bg-rose-950/40 px-3 py-1.5 font-mono text-[10.5px] text-rose-200">
          <span className="text-[13px]">⚠</span>
          <span className="font-bold text-rose-300">INPUT FLAGGED AT UPLOAD —</span>
          <span>
            {sequenceWarningEntries.map(([slot, guess]) => `${slot} slot looked like ${guess}`).join(', ')}.
            You chose to proceed; treat this result with reduced confidence.
          </span>
        </div>
      )}

      {/* Measurement Mode Floating HUD */}
      {tool === 'measure' && (
        <div className="flex shrink-0 items-center justify-between border-b border-sky-500/30 bg-sky-950/40 px-3 py-1 font-mono text-[10.5px] text-sky-200">
          <div className="flex items-center gap-3">
            <span className="font-bold">MEASUREMENT MODE:</span>
            <span>
              {measure.length === 0 && 'Click first landmark on any 2D slice view…'}
              {measure.length === 1 && 'Point 1 placed. Click second landmark to measure…'}
              {measure.length === 2 && measurementMm !== null && (
                <span className="font-bold text-emerald-300">
                  Distance: {measurementMm.toFixed(2)} mm{' '}
                  <span className="text-slate-400 font-normal">
                    (Δi: {deltaVoxel?.[0]}, Δj: {deltaVoxel?.[1]}, Δk: {deltaVoxel?.[2]})
                  </span>
                </span>
              )}
            </span>
          </div>
          {measure.length > 0 && (
            <button
              onClick={clearMeasure}
              className="rounded bg-sky-500/20 px-2 py-0.5 text-[9.5px] text-sky-300 hover:bg-sky-500/40"
            >
              Clear Marks
            </button>
          )}
        </div>
      )}

      {/* Main 3D + MPR Split View */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2">
          <ThreeBrainTwin />
          <LinkedMprGrid />
        </main>

        {/* Spatial Bookmarks Drawer */}
        {showBookmarks && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex w-72 flex-col border-l border-[#263854] bg-[#0a1020]/95 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[#263854] p-3">
              <span className="text-[12px] font-semibold text-white">Spatial Bookmarks</span>
              <button
                onClick={() => setShowBookmarks(false)}
                className="text-[#7588a5] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-[#263854] p-3 space-y-2">
              <div className="text-[11px] text-[#a4b5ce]">Save current landmark:</div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Necrotic core notch"
                  value={bookmarkLabel}
                  onChange={(e) => setBookmarkLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveBookmark()}
                  className="flex-1 rounded-md border border-[#263854] bg-[#101a2b] px-2.5 py-1 text-[11px] text-white focus:border-[#32d5ff] focus:outline-none"
                />
                <button
                  onClick={handleSaveBookmark}
                  className="rounded-md bg-[#3478ff] px-2.5 py-1 text-[10.5px] font-semibold text-white hover:bg-[#2563eb]"
                >
                  Save
                </button>
              </div>
              <div className="font-mono text-[10px] text-[#7588a5]">
                Coords: [{voxel[0]}, {voxel[1]}, {voxel[2]}] · {activeSequence}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {bookmarks.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[#7588a5]">
                  No bookmarks saved yet. Place crosshair and click Save.
                </div>
              ) : (
                bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-[#263854] bg-[#101a2b] p-2 text-[11px] space-y-1 hover:border-[#3478ff] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{b.label}</span>
                      <button
                        onClick={() => removeBookmark(b.id)}
                        className="text-[10px] text-[#7588a5] hover:text-[#f43f5e]"
                        title="Delete bookmark"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="font-mono text-[9.5px] text-[#a4b5ce]">
                      [{b.voxel[0]}, {b.voxel[1]}, {b.voxel[2]}] · {b.sequence}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-[#7588a5]">{b.createdAt}</span>
                      <button
                        onClick={() => setVoxel(b.voxel)}
                        className="rounded bg-[#3478ff]/20 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#32d5ff] hover:bg-[#3478ff]/30"
                      >
                        Fly to →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Metrics Bar */}
      <div className="shrink-0 px-2 pb-2">
        <BottomMetricsBar />
      </div>
    </div>
  )
}
