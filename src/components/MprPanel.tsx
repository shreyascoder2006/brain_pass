import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { edgeLetters, PLANES } from '../lib/planes'
import type { PlaneKey } from '../state/store'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import { useLiveStudy } from '../state/liveStudy'
import { axisOrientation, voxelToWorld, type SequenceName, type Vec3 } from '../lib/volume'

const CODE_COLOUR: Record<number, [number, number, number]> = {
  1: [245, 158, 11],  // NCR -> amber (tumour core)
  2: [16, 185, 129],  // ED  -> teal-green (whole tumour)
  4: [244, 63, 94],   // ET  -> coral-pink (enhancing)
}

/** Confidence heat ramp: blue (agreement) through cyan/yellow to red (disagreement). */
const HEAT_STOPS: [number, number, number, number][] = [
  [0.0, 37, 99, 235],
  [0.33, 34, 211, 238],
  [0.66, 250, 204, 21],
  [1.0, 239, 68, 68],
]
function heatColour(t: number): [number, number, number] {
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [t0, r0, g0, b0] = HEAT_STOPS[i - 1]
    const [t1, r1, g1, b1] = HEAT_STOPS[i]
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1)
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f]
    }
  }
  return [239, 68, 68]
}

/** Agreement colours: a hit is reassuring, a false alarm is a nuisance, a miss
 *  is the one that matters — so the ramp runs calm → warm → alarming. */
const AGREEMENT_COLOUR = {
  tp: [52, 168, 128] as [number, number, number],
  fp: [234, 160, 60] as [number, number, number],
  fn: [233, 72, 94] as [number, number, number],
}

/** Standard radiology window/level: everything below centre−width/2 is black,
 *  everything above centre+width/2 is white, linear in between. */
function applyWindow(g: number, centre: number, width: number): number {
  const lo = centre - width / 2
  const v = ((g - lo) / (width || 1)) * 255
  return v < 0 ? 0 : v > 255 ? 255 : v
}

export default function MprPanel({
  plane, sequenceOverride, title, headerRight, compact,
}: {
  plane: PlaneKey
  sequenceOverride?: SequenceName
  title?: string
  headerRight?: ReactNode
  compact?: boolean
}) {
  const { study, crop, uncertainty } = useStudy()
  const {
    voxel, setVoxel, sequence, maskSource, showOverlay, overlayMode, activePanel, setActivePanel,
    tool, measure, pushMeasure, windowCenter, windowWidth, setWindow,
  } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreen = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const dragging = useRef(false)
  const windowDrag = useRef<{ x: number; y: number; centre: number; width: number } | null>(null)

  const def = PLANES[plane]
  const seq = sequenceOverride ?? sequence
  const letters = edgeLetters(def, study.affine)
  const slice = voxel[def.fixed]
  const label = maskSource === 'predicted' ? study.predicted : study.expert

  // Set only when the user overrode UploadPanel's filename-mismatch warning —
  // see state/liveStudy.ts. Advisory, client-side only; the backend's own
  // validation (shape/affine/NaN/etc.) is untouched and stays all-or-nothing.
  const flaggedGuess = useLiveStudy((s) => s.sequenceWarnings[seq])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** Canvas-pixel rect the slice image occupies, preserving physical aspect. */
  const layout = useCallback(() => {
    const { spacing } = study
    const hCount = crop.hi[def.hAxis] - crop.lo[def.hAxis]
    const vCount = crop.hi[def.vAxis] - crop.lo[def.vAxis]
    const physW = hCount * spacing[def.hAxis]
    const physH = vCount * spacing[def.vAxis]
    const scale = Math.min(size.w / physW, size.h / physH) * 0.94
    const drawW = physW * scale
    const drawH = physH * scale
    return {
      hCount, vCount, drawW, drawH,
      x: (size.w - drawW) / 2,
      y: (size.h - drawH) / 2,
    }
  }, [study, def, size, crop])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0 || size.h === 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    const { dims } = study
    const data = study.sequences[seq].data
    const { hCount, vCount, drawW, drawH, x, y } = layout()

    const off = offscreen.current
    off.width = hCount
    off.height = vCount
    const octx = off.getContext('2d')!
    const img = octx.createImageData(hCount, vCount)
    const px = img.data

    const [nx, ny] = dims
    const vox: Vec3 = [0, 0, 0]
    vox[def.fixed] = slice

    const at = (h: number, v: number) => {
      vox[def.hAxis] = h
      vox[def.vAxis] = v
      return vox[0] + nx * (vox[1] + ny * vox[2])
    }

    for (let row = 0; row < vCount; row++) {
      const vIdx = crop.lo[def.vAxis] + (def.vDir > 0 ? vCount - 1 - row : row)
      for (let col = 0; col < hCount; col++) {
        const hIdx = crop.lo[def.hAxis] + (def.hDir > 0 ? col : hCount - 1 - col)
        const p = at(hIdx, vIdx)
        const g = applyWindow(data[p], windowCenter, windowWidth)
        const o = (row * hCount + col) * 4
        px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = 255

        if (!showOverlay) continue

        if (overlayMode === 'agreement') {
          // Whole-tumour extent on both sides: the question this overlay answers
          // is "did it find the tumour, and where did it get the edge wrong".
          const inPred = study.predicted[p] !== 0
          const inTruth = study.expert[p] !== 0
          if (!inPred && !inTruth) continue
          const c = inPred && inTruth ? AGREEMENT_COLOUR.tp
            : inPred ? AGREEMENT_COLOUR.fp
            : AGREEMENT_COLOUR.fn
          // Disagreement is washed harder than agreement so the eye lands on it.
          const a = inPred && inTruth ? 0.3 : 0.6
          px[o] = c[0] * a + px[o] * (1 - a)
          px[o + 1] = c[1] * a + px[o + 1] * (1 - a)
          px[o + 2] = c[2] * a + px[o + 2] * (1 - a)
          continue
        }

        if (overlayMode === 'uncertainty' && uncertainty) {
          const u = Math.max(uncertainty.WT[p], uncertainty.TC[p], uncertainty.ET[p])
          if (!u) continue
          const t = u / 255
          const c = heatColour(t)
          const a = Math.min(0.85, 0.15 + t * 0.7)
          px[o] = c[0] * a + px[o] * (1 - a)
          px[o + 1] = c[1] * a + px[o + 1] * (1 - a)
          px[o + 2] = c[2] * a + px[o + 2] * (1 - a)
          continue
        }

        const code = label[p]
        if (!code) continue
        const c = CODE_COLOUR[code]
        if (!c) continue

        // A soft wash rather than a hard contour: the reference blends the region
        // into the anatomy so the underlying tissue stays readable through it.
        const a = 0.42
        px[o] = c[0] * a + px[o] * (1 - a)
        px[o + 1] = c[1] * a + px[o + 1] * (1 - a)
        px[o + 2] = c[2] * a + px[o + 2] * (1 - a)
      }
    }
    octx.putImageData(img, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(off, x, y, drawW, drawH)

    /** Voxel index -> canvas pixel, shared by the crosshair and any measurement
     *  drawn on this plane so they can never drift apart. */
    const project = (v: Vec3) => {
      const hLocal = v[def.hAxis] - crop.lo[def.hAxis]
      const vLocal = v[def.vAxis] - crop.lo[def.vAxis]
      const hPix = def.hDir > 0 ? hLocal : hCount - 1 - hLocal
      const vPix = def.vDir > 0 ? vCount - 1 - vLocal : vLocal
      return {
        cx: x + ((hPix + 0.5) / hCount) * drawW,
        cy: y + ((vPix + 0.5) / vCount) * drawH,
      }
    }

    // Crosshair in electric cyan
    const { cx, cy } = project(voxel)
    const gap = 7

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(50, 213, 255, 0.9)'
    ctx.beginPath()
    ctx.moveTo(x, cy); ctx.lineTo(cx - gap, cy)
    ctx.moveTo(cx + gap, cy); ctx.lineTo(x + drawW, cy)
    ctx.moveTo(cx, y); ctx.lineTo(cx, cy - gap)
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, y + drawH)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(50, 213, 255, 0.65)'
    ctx.beginPath()
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2)
    ctx.stroke()

    // Measurement, drawn only on the plane its points were placed in.
    const mine = measure.filter((m) => m.plane === plane)
    if (mine.length) {
      const pts = mine.map((m) => project(m.voxel))
      ctx.strokeStyle = '#f5d76e'
      ctx.fillStyle = '#f5d76e'
      ctx.lineWidth = 1.25

      for (const p of pts) {
        ctx.beginPath()
        ctx.moveTo(p.cx - 5, p.cy); ctx.lineTo(p.cx + 5, p.cy)
        ctx.moveTo(p.cx, p.cy - 5); ctx.lineTo(p.cx, p.cy + 5)
        ctx.stroke()
      }

      if (pts.length === 2) {
        ctx.beginPath()
        ctx.moveTo(pts[0].cx, pts[0].cy)
        ctx.lineTo(pts[1].cx, pts[1].cy)
        ctx.stroke()

        const [a, b] = mine
        const mm = Math.sqrt(
          ((a.voxel[0] - b.voxel[0]) * study.spacing[0]) ** 2 +
          ((a.voxel[1] - b.voxel[1]) * study.spacing[1]) ** 2 +
          ((a.voxel[2] - b.voxel[2]) * study.spacing[2]) ** 2,
        )
        const text = `${mm.toFixed(1)} mm`
        const mx = (pts[0].cx + pts[1].cx) / 2
        const my = (pts[0].cy + pts[1].cy) / 2
        ctx.font = '600 11px ui-monospace, SFMono-Regular, Consolas, monospace'
        const w = ctx.measureText(text).width
        ctx.fillStyle = 'rgba(10, 14, 20, 0.85)'
        ctx.fillRect(mx - w / 2 - 4, my - 16, w + 8, 15)
        ctx.fillStyle = '#f5d76e'
        ctx.fillText(text, mx - w / 2, my - 5)
      }
    }
  }, [size, study, seq, slice, voxel, def, label, showOverlay, overlayMode, uncertainty, layout, crop,
      windowCenter, windowWidth, measure, plane])

  /** Canvas point -> voxel index on this plane, or null outside the image. */
  const voxelAt = useCallback((clientX: number, clientY: number): Vec3 | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { hCount, vCount, drawW, drawH, x, y } = layout()
    const fx = (clientX - rect.left - x) / drawW
    const fy = (clientY - rect.top - y) / drawH
    if (fx < 0 || fy < 0 || fx > 1 || fy > 1) return null

    let h = Math.floor(fx * hCount)
    let v = Math.floor(fy * vCount)
    h = def.hDir > 0 ? h : hCount - 1 - h
    v = def.vDir > 0 ? vCount - 1 - v : v

    const next: Vec3 = [...voxel] as Vec3
    const clamp = (n: number, axis: 0 | 1 | 2) =>
      Math.min(crop.hi[axis] - 1, Math.max(crop.lo[axis], crop.lo[axis] + n))
    next[def.hAxis] = clamp(h, def.hAxis)
    next[def.vAxis] = clamp(v, def.vAxis)
    return next
  }, [layout, def, voxel, crop])

  const pick = useCallback((clientX: number, clientY: number) => {
    const next = voxelAt(clientX, clientY)
    if (next) setVoxel(next)
  }, [voxelAt, setVoxel])

  const onWheel = (e: React.WheelEvent) => {
    const next: Vec3 = [...voxel] as Vec3
    const d = e.deltaY > 0 ? -1 : 1
    next[def.fixed] = Math.min(study.dims[def.fixed] - 1, Math.max(0, next[def.fixed] + d))
    setVoxel(next)
  }

  const sliceWorld = voxelToWorld(study.affine, voxel[0], voxel[1], voxel[2])
  const sliceMm = sliceWorld[axisOrientation(study.affine)[def.fixed].worldAxis]

  const active = activePanel === plane

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-[#05070d] transition-colors ${
        active ? 'border-[#32d5ff] shadow-sm shadow-[#32d5ff]/20' : 'border-[#263854]'
      }`}
    >
      <div className={`flex shrink-0 items-center justify-between border-b px-2.5 py-1.5 ${
        flaggedGuess ? 'border-rose-600/50 bg-rose-950/40' : 'border-[#263854] bg-[#0a1020]'
      }`}>
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-bold text-white capitalize">{title ?? def.label}</span>
          <span className="font-mono text-[10.5px] font-semibold text-[#32d5ff]">
            {def.fixed === 0 ? 'X' : def.fixed === 1 ? 'Y' : 'Z'} = {slice} / {study.dims[def.fixed] - 1}
          </span>
          {flaggedGuess && (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-rose-300">
              ⚠ invalid
            </span>
          )}
        </div>
        {headerRight ?? (
          <span className="font-mono text-[10px] text-[#a4b5ce]">
            {seq} · {sliceMm.toFixed(1)} mm
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
      <div
        ref={wrapRef}
        className={`relative min-h-0 flex-1 select-none ${
          flaggedGuess ? 'cursor-default'
          : tool === 'measure' ? 'cursor-cell' : tool === 'window' ? 'cursor-ns-resize' : 'cursor-crosshair'
        }`}
        onPointerDown={(e) => {
          if (flaggedGuess) return
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          setActivePanel(plane)
          if (tool === 'window') {
            windowDrag.current = { x: e.clientX, y: e.clientY, centre: windowCenter, width: windowWidth }
            return
          }
          if (tool === 'measure') {
            const v = voxelAt(e.clientX, e.clientY)
            if (v) pushMeasure({ voxel: v, plane })
            return
          }
          dragging.current = true
          pick(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (flaggedGuess) return
          if (windowDrag.current) {
            // The radiology convention: drag across to widen, up to brighten.
            const d = windowDrag.current
            setWindow(
              Math.round(Math.max(1, Math.min(255, d.centre - (e.clientY - d.y) * 0.6))),
              Math.round(Math.max(2, Math.min(510, d.width + (e.clientX - d.x) * 0.9))),
            )
            return
          }
          if (dragging.current) pick(e.clientX, e.clientY)
        }}
        onPointerUp={() => { dragging.current = false; windowDrag.current = null }}
        onPointerLeave={() => { dragging.current = false; windowDrag.current = null }}
        onWheel={onWheel}
      >
        {flaggedGuess ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1a0f12] px-4 text-center">
            <span className="text-[24px]">⚠️</span>
            <span className="text-[12px] font-bold uppercase tracking-wide text-rose-400">Invalid input</span>
            <span className="max-w-[230px] font-mono text-[10px] leading-relaxed text-rose-200/70">
              Labelled {seq}, but its filename suggested {flaggedGuess} at upload. Flagged by the user
              at the upload-confirmation step — not displayed.
            </span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            id={compact ? undefined : `mpr-canvas-${plane}`}
            className="block h-full w-full"
            style={{ width: '100%', height: '100%' }}
          />
        )}

        {!flaggedGuess && (
        <>
        <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold text-slate-400">
          {letters.left}
        </span>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold text-slate-400">
          {letters.right}
        </span>
        <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 font-mono text-[10px] font-semibold text-slate-400">
          {letters.top}
        </span>
        <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[10px] font-semibold text-slate-400">
          {letters.bottom}
        </span>
        {compact ? null : (
          <span className="pointer-events-none absolute bottom-1 right-1.5 font-mono text-[9px] text-slate-600">
            {study.spacing[def.hAxis].toFixed(2)}×{study.spacing[def.vAxis].toFixed(2)} mm/px
          </span>
        )}
        </>
        )}
      </div>

        {/* Absolute inset gives the track a definite height; a percentage height
            inside an auto-sized flex column runs away. */}
        <div className="relative w-6 shrink-0">
          <input
            type="range"
            className="vertical absolute inset-y-2 left-1/2 -translate-x-1/2"
            min={crop.lo[def.fixed]}
            max={crop.hi[def.fixed] - 1}
            step={1}
            value={slice}
            onChange={(e) => {
              const next: Vec3 = [...voxel] as Vec3
              next[def.fixed] = Number(e.target.value)
              setActivePanel(plane)
              setVoxel(next)
            }}
            aria-label={`${def.label} slice`}
          />
        </div>
      </div>
    </div>
  )
}
