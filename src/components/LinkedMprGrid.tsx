import { useState } from 'react'
import { SEQUENCES, type SequenceName, type Vec3 } from '../lib/volume'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import MprPanel from './MprPanel'
import { meshCentroid } from '../lib/meshing'
import { worldToVoxel, clampVoxel } from '../lib/volume'

function Icon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  crosshair: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 12h.01',
  contrast: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm9 9l-9 5-9-5',
  ruler: 'M3 15l6-6 6 6-6 6-6-6zm9-9l6 6M15 9l1.5-1.5',
  compare: 'M12 3v18M7 7l-4 5 4 5M17 7l4 5-4 5',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-5a4 4 0 100-8 4 4 0 000 8z',
  reset: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8M3 3v5h5',
  pulse: 'M3 12h4l2-7 4 14 2-7h6',
  agreement: 'M10 8a4 4 0 100 8 4 4 0 000-8zM14 8a4 4 0 100 8 4 4 0 000-8z',
}

function ToolButton({
  title, path, active, onClick,
}: { title: string; path: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded transition ${
        active
          ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <Icon d={path} />
    </button>
  )
}

export default function LinkedMprGrid() {
  const { study, meshes, inverseAffine, uncertainty, liveMetadata, mode } = useStudy()
  const {
    sequence, setSequence, showOverlay, toggleOverlay,
    maskSource, setMaskSource, setVoxel, isolated,
    overlayMode, setOverlayMode,
    tool, setTool, measure, clearMeasure,
    windowCenter, windowWidth, resetWindow,
  } = useStore()
  const [compareSeq, setCompareSeq] = useState<SequenceName>('FLAIR')

  // Agreement needs something to disagree with: the demo phantom always has an
  // expert mask, a live study only when one was uploaded.
  const hasExpert = mode === 'demo' || Boolean(liveMetadata?.has_expert)

  const centreOnTumour = () => {
    const m = meshes[maskSource][isolated ?? 'ET'] ?? meshes[maskSource].WT
    if (!m) return
    const c = meshCentroid(m)
    const v = worldToVoxel(inverseAffine, c[0], c[1], c[2])
    setVoxel(clampVoxel(study.dims, v))
  }

  const recentre = () => {
    setVoxel(study.dims.map((d) => Math.floor(d / 2)) as Vec3)
  }

  return (
    <div className="flex h-full min-h-0 gap-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#263854] bg-[#0a1020]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#263854] px-3 py-2">
          <h2 className="text-[13px] font-bold tracking-tight text-white">Linked MPR Viewers</h2>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-md border border-[#263854] bg-[#101a2b] p-0.5 text-[10.5px]">
              {(['predicted', 'expert'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMaskSource(m)}
                  className={`rounded px-2.5 py-0.5 font-semibold capitalize transition ${
                    maskSource === m
                      ? 'bg-[#3478ff] text-white shadow-sm'
                      : 'text-[#7588a5] hover:text-white'
                  }`}
                >
                  {m === 'predicted' ? 'Model' : 'Expert'}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] text-[#7588a5]">1 crosshair · 4 views</span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 p-2">
          <MprPanel plane="axial" />
          <MprPanel plane="coronal" />
          <MprPanel plane="sagittal" />

          <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-[#263854] bg-[#05070d]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#263854] bg-[#0a1020] px-2.5 py-1.5">
              <span className="text-[11.5px] font-semibold text-white">Sequence Selector</span>
              <span className="font-mono text-[9.5px] text-[#32d5ff]">compare</span>
            </div>
            <div className="shrink-0 px-2 pt-2">
              <select
                value={compareSeq}
                onChange={(e) => setCompareSeq(e.target.value as SequenceName)}
                className="w-full rounded-md border border-[#263854] bg-[#101a2b] px-2 py-1 text-[11px] font-medium text-white outline-none focus:border-[#3478ff]"
              >
                {SEQUENCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="min-h-0 flex-1 p-1">
              <MprPanel plane="axial" sequenceOverride={compareSeq} title={compareSeq} compact />
            </div>
          </div>
        </div>

        {/* Bottom Base Sequence Bar matching UI Sample 2 */}
        <div className="flex shrink-0 items-center justify-between border-t border-[#263854] px-3 py-1.5 bg-[#0a1020]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#7588a5]">Base sequence</span>
            <div className="flex overflow-hidden rounded-md border border-[#263854] bg-[#101a2b] p-0.5">
              {SEQUENCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSequence(s)}
                  className={`rounded px-2.5 py-0.5 text-[10.5px] font-semibold transition ${
                    sequence === s
                      ? 'bg-[#3478ff] text-white shadow-sm'
                      : 'text-[#7588a5] hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 font-mono text-[10px] text-[#a4b5ce]">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full bg-[#10b981]" />
              <span>Both agree</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span>Model only</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full bg-[#f43f5e]" />
              <span>Expert only</span>
            </span>
          </div>
        </div>
      </div>


      <div className="flex w-10 shrink-0 flex-col items-center gap-1.5 rounded-lg border border-[#263854] bg-[#0a1020] py-2.5">
        <ToolButton
          title="Crosshair — click any view to move it (C)"
          path={ICONS.crosshair}
          active={tool === 'crosshair'}
          onClick={() => setTool('crosshair')}
        />
        <ToolButton
          title={showOverlay ? 'Hide segmentation overlay (O)' : 'Show segmentation overlay (O)'}
          path={ICONS.layers}
          active={showOverlay}
          onClick={toggleOverlay}
        />
        <ToolButton
          title="Toggle model / expert mask (E)"
          path={ICONS.compare}
          active={maskSource === 'expert'}
          onClick={() => setMaskSource(maskSource === 'predicted' ? 'expert' : 'predicted')}
        />
        {uncertainty && (
          <ToolButton
            title={overlayMode === 'uncertainty' ? 'Show segmentation colours (U)' : 'Show model confidence — flip-TTA uncertainty (U)'}
            path={ICONS.pulse}
            active={overlayMode === 'uncertainty'}
            onClick={() => setOverlayMode(overlayMode === 'uncertainty' ? 'segmentation' : 'uncertainty')}
          />
        )}
        {hasExpert && (
          <ToolButton
            title={overlayMode === 'agreement'
              ? 'Show segmentation colours (A)'
              : 'Show agreement with the expert mask — hit / false alarm / miss (A)'}
            path={ICONS.agreement}
            active={overlayMode === 'agreement'}
            onClick={() => setOverlayMode(overlayMode === 'agreement' ? 'segmentation' : 'agreement')}
          />
        )}
        <ToolButton title="Jump to tumour centroid (T)" path={ICONS.target} onClick={centreOnTumour} />
        <div className="my-1 h-px w-5 bg-edge" />
        <ToolButton
          title={`Window / contrast — drag on a view: up brightens, right widens (W). Now ${windowCenter}/${windowWidth}`}
          path={ICONS.contrast}
          active={tool === 'window'}
          onClick={() => setTool(tool === 'window' ? 'crosshair' : 'window')}
        />
        <ToolButton
          title="Measure — click two points on one view for a distance in mm (M)"
          path={ICONS.ruler}
          active={tool === 'measure'}
          onClick={() => setTool(tool === 'measure' ? 'crosshair' : 'measure')}
        />
        <ToolButton
          title={tool === 'window' ? 'Reset the window to its default' : 'Reset crosshair to centre (R)'}
          path={ICONS.reset}
          onClick={() => {
            if (tool === 'window') resetWindow()
            else if (measure.length) clearMeasure()
            else recentre()
          }}
        />
      </div>
    </div>
  )
}
