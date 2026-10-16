import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { edgeLetters, PLANES } from '../lib/planes'
import type { PlaneKey } from '../state/store'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import { axisOrientation, voxelToWorld, type SequenceName, type Vec3 } from '../lib/volume'

const CODE_COLOUR: Record<number, [number, number, number]> = {
  1: [242, 167, 92],  // NCR -> amber (tumour core)
  2: [79, 201, 166],  // ED  -> teal  (whole tumour)
  4: [232, 115, 142], // ET  -> rose  (enhancing)
}

/** Lifts the MRI towards the bright window the reference renders at. */
function window_(g: number): number {
  const v = 14 + g * 1.42
  return v > 255 ? 255 : v
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
  const { study, crop } = useStudy()
  const { voxel, setVoxel, sequence, maskSource, showOverlay, activePanel, setActivePanel } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreen = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const dragging = useRef(false)

  const def = PLANES[plane]
  const seq = sequenceOverride ?? sequence
  const letters = edgeLetters(def, study.affine)
  const slice = voxel[def.fixed]
  const label = maskSource === 'predicted' ? study.predicted : study.expert

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
        const g = window_(data[p])
        const o = (row * hCount + col) * 4
        px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = 255

        if (!showOverlay) continue
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

    // Crosshair
    const hLocal = voxel[def.hAxis] - crop.lo[def.hAxis]
    const vLocal = voxel[def.vAxis] - crop.lo[def.vAxis]
    const hPix = def.hDir > 0 ? hLocal : hCount - 1 - hLocal
    const vPix = def.vDir > 0 ? vCount - 1 - vLocal : vLocal
    const cx = x + ((hPix + 0.5) / hCount) * drawW
    const cy = y + ((vPix + 0.5) / vCount) * drawH
    const gap = 7

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)'
    ctx.beginPath()
    ctx.moveTo(x, cy); ctx.lineTo(cx - gap, cy)
    ctx.moveTo(cx + gap, cy); ctx.lineTo(x + drawW, cy)
    ctx.moveTo(cx, y); ctx.lineTo(cx, cy - gap)
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, y + drawH)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)'
    ctx.beginPath()
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2)
    ctx.stroke()
  }, [size, study, seq, slice, voxel, def, label, showOverlay, layout, crop])

  const pick = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { hCount, vCount, drawW, drawH, x, y } = layout()
    const fx = (clientX - rect.left - x) / drawW
    const fy = (clientY - rect.top - y) / drawH
    if (fx < 0 || fy < 0 || fx > 1 || fy > 1) return

    let h = Math.floor(fx * hCount)
    let v = Math.floor(fy * vCount)
    h = def.hDir > 0 ? h : hCount - 1 - h
    v = def.vDir > 0 ? vCount - 1 - v : v

    const next: Vec3 = [...voxel] as Vec3
    const clamp = (x: number, axis: 0 | 1 | 2) =>
      Math.min(crop.hi[axis] - 1, Math.max(crop.lo[axis], crop.lo[axis] + x))
    next[def.hAxis] = clamp(h, def.hAxis)
    next[def.vAxis] = clamp(v, def.vAxis)
    setVoxel(next)
  }, [layout, def, voxel, setVoxel, crop])

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
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-[#0a0e14] transition-colors ${
        active ? 'border-emerald-500/70' : 'border-edge'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-edge-soft bg-panel px-2.5 py-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11.5px] font-medium text-slate-200">{title ?? def.label}</span>
          <span className="font-mono text-[10px] text-sky-400">
            {def.fixed === 0 ? 'X' : def.fixed === 1 ? 'Y' : 'Z'} = {slice} / {study.dims[def.fixed] - 1}
          </span>
        </div>
        {headerRight ?? (
          <span className="font-mono text-[9.5px] text-slate-500">
            {seq} · {sliceMm.toFixed(1)} mm
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 cursor-crosshair select-none"
        onPointerDown={(e) => {
          dragging.current = true
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          setActivePanel(plane)
          pick(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => { if (dragging.current) pick(e.clientX, e.clientY) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerLeave={() => { dragging.current = false }}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className="block h-full w-full" style={{ width: '100%', height: '100%' }} />

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
