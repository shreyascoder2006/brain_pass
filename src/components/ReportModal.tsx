import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { reportUrl } from '../lib/api'
import { captureRegistry } from '../lib/captureRegistry'
import { buildFindings, type Findings } from '../lib/findings'
import { centroidVoxel, REGIONS, regionMask } from '../lib/regions'
import { clampVoxel, worldToVoxel, type Vec3 } from '../lib/volume'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import ReportView, { type ReportImages } from './ReportView'

const BLANK_IMAGES: ReportImages = { three: null, axial: null, coronal: null, sagittal: null }

function grab(el: Element | null): string | null {
  const canvas = el as HTMLCanvasElement | null
  if (!canvas) return null
  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * The 3D canvas renders with alpha:true, so toDataURL() alone captures a
 * transparent PNG — on screen the dark backdrop comes from CSS behind it.
 * Embedded straight into a white report page, that transparency makes the
 * pale cortical surface and bloom (tuned for a dark background) read as
 * washed-out and dull. Composite the same backdrop in before capturing.
 */
function grabThreeWithBackdrop(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas) return null
  try {
    const w = canvas.width
    const h = canvas.height
    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    const ctx = off.getContext('2d')!
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.75)
    grad.addColorStop(0, '#0d1527')
    grad.addColorStop(0.55, '#080d19')
    grad.addColorStop(1, '#05070d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(canvas, 0, 0)
    return off.toDataURL('image/png')
  } catch {
    return null
  }
}

export default function ReportModal() {
  const bundle = useStudy()
  const reportOpen = useStore((s) => s.reportOpen)
  const setReportOpen = useStore((s) => s.setReportOpen)

  const [stage, setStage] = useState<'idle' | 'capturing' | 'ready'>('idle')
  const [images, setImages] = useState<ReportImages>(BLANK_IMAGES)
  const [findings, setFindings] = useState<Findings | null>(null)
  const [generatedAt, setGeneratedAt] = useState('')

  const reportId = useMemo(() => `NS-${bundle.sha256.slice(0, 10).toUpperCase()}`, [bundle.sha256])

  useEffect(() => {
    if (!reportOpen) {
      setStage('idle')
      setImages(BLANK_IMAGES)
      setFindings(null)
      return
    }

    // Live, uploaded studies already have a real backend-rendered provenance
    // report with actual model/preprocessing details — open that instead of
    // building a client-side one, and don't leave this modal sitting open.
    if (bundle.mode === 'live' && bundle.jobId) {
      window.open(reportUrl(bundle.jobId), '_blank')
      setReportOpen(false)
      return
    }

    let cancelled = false
    setStage('capturing')

    const prev = useStore.getState()
    const viewerSnapshot = {
      regions: prev.regions, isolated: prev.isolated, wireframe: prev.wireframe,
      brainVisible: prev.brainVisible, brainOpacity: prev.brainOpacity, autoOrbit: prev.autoOrbit,
      maskSource: prev.maskSource, sequence: prev.sequence, showOverlay: prev.showOverlay,
      overlayMode: prev.overlayMode, voxel: prev.voxel, tool: prev.tool,
      hideCrosshair: prev.hideCrosshair,
    }

    const persona = bundle.study.persona
    let voxel: Vec3
    if (persona?.tumour) {
      voxel = clampVoxel(bundle.study.dims, worldToVoxel(bundle.inverseAffine, ...persona.tumour.centre))
    } else {
      const wtDef = REGIONS.find((r) => r.key === 'WT')!
      const mask = regionMask(bundle.study.predicted, wtDef.codes)
      voxel = clampVoxel(bundle.study.dims, centroidVoxel(mask, bundle.study.dims))
    }

    // Force a consistent, fully-visible view for the capture — the report
    // should not depend on whatever the user happened to have toggled.
    useStore.setState({
      regions: {
        WT: { visible: true, opacity: 0.3 },
        TC: { visible: true, opacity: 0.6 },
        ET: { visible: true, opacity: 0.82 },
      },
      isolated: null,
      wireframe: false,
      brainVisible: true,
      brainOpacity: Math.max(prev.brainOpacity, 0.2),
      autoOrbit: false,
      maskSource: 'predicted',
      sequence: 'T1Gd',
      showOverlay: true,
      overlayMode: 'segmentation',
      tool: 'crosshair',
      voxel,
      hideCrosshair: true,
    })

    ;(async () => {
      // A plain timeout, not requestAnimationFrame: rAF never fires in a
      // backgrounded tab, which would hang this indefinitely. The delay just
      // needs to clear react-three-fiber's render and the 2D canvases' redraw.
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled) return

      setImages({
        three: grabThreeWithBackdrop(captureRegistry.threeCanvas),
        axial: grab(document.getElementById('mpr-canvas-axial')),
        coronal: grab(document.getElementById('mpr-canvas-coronal')),
        sagittal: grab(document.getElementById('mpr-canvas-sagittal')),
      })
      setFindings(buildFindings(bundle))
      setGeneratedAt(new Date().toLocaleString())
      setStage('ready')

      useStore.setState(viewerSnapshot)
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportOpen, bundle.study.caseId])

  if (!reportOpen) return null

  const persona = bundle.study.persona

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
      <div className="no-print flex shrink-0 items-center justify-between border-b border-[#263854] bg-[#0a1020] px-4 py-2.5">
        <div>
          <div className="text-[13px] font-semibold text-slate-100">Medical Report</div>
          <div className="text-[10.5px] text-slate-500">
            NeuroScope 3D · {persona ? `${persona.name} — ${bundle.study.caseId}` : bundle.study.caseId} · research &amp; teaching prototype
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={stage !== 'ready'}
            className="rounded bg-sky-500 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={() => setReportOpen(false)}
            className="rounded border border-[#263854] px-3 py-1.5 text-[11.5px] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-500 p-6">
        {stage !== 'ready' || !findings ? (
          <div className="mx-auto flex h-[600px] max-w-[880px] flex-col items-center justify-center gap-3 rounded bg-white">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-500" />
            </div>
            <div className="text-[12px] text-slate-500">Capturing digital twin and slice views…</div>
          </div>
        ) : (
          <ReportView
            bundle={bundle}
            images={images}
            findings={findings}
            reportId={reportId}
            generatedAt={generatedAt}
          />
        )}
      </div>

      {/* Printed from here, not from the preview above: #print-root is a plain
          child of <body>, so it has no fixed/scrollable ancestor to clip
          multi-page content. See the @media print rules in index.css. */}
      {stage === 'ready' && findings && document.getElementById('print-root') &&
        createPortal(
          <ReportView
            bundle={bundle}
            images={images}
            findings={findings}
            reportId={reportId}
            generatedAt={generatedAt}
          />,
          document.getElementById('print-root')!,
        )}
    </div>
  )
}
