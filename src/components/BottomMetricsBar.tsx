import { REGIONS, type RegionKey } from '../lib/regions'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import type { Vec3 } from '../lib/volume'
import QualityCentre from './QualityCentre'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-lg border border-[#263854] bg-[#0a1020] p-3 shadow-md shadow-black/20 ${className}`}>
      {children}
    </div>
  )
}

function RegionCard({ k }: { k: RegionKey }) {
  const { report, study } = useStudy()
  const { maskSource, setIsolated, isolated } = useStore()
  const r = report[k]
  const shown = maskSource === 'expert' ? r.expertML : r.predML
  const voxels = maskSource === 'expert' ? r.expertVoxels : r.predVoxels
  const [dx, dy, dz] = study.spacing

  return (
    <button
      onClick={() => setIsolated(isolated === k ? null : k)}
      className={`relative min-w-0 rounded-lg border p-3 text-left transition hover:border-[#3478ff] shadow-md shadow-black/20 ${
        isolated === k
          ? 'border-[#32d5ff] bg-[#101a2b] ring-1 ring-[#32d5ff]'
          : 'border-[#263854] bg-[#0a1020]'
      }`}
    >
      {/* Mini brain silhouette icon on top-right matching UI Sample 2 */}
      <span className="absolute right-3 top-3 text-[#263854] transition group-hover:text-[#3478ff]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
          <path d="M12 4a4 4 0 00-4 4 3 3 0 00-1 5.8V16a3 3 0 003 3h4a3 3 0 003-3v-2.2A3 3 0 0016 8a4 4 0 00-4-4z" />
        </svg>
      </span>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.def.colour }} />
        <span className="truncate text-[12px] font-semibold text-white">
          {r.def.label} ({r.def.short})
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-[24px] font-bold tracking-tight text-white">
          {shown.toFixed(2)}
        </span>
        <span className="text-[12px] font-medium text-[#a4b5ce]">mL</span>
      </div>

      <div className="mt-1 font-mono text-[10px] text-[#7588a5] truncate">
        {voxels.toLocaleString()} vox ({dx.toFixed(2)}×{dy.toFixed(2)}×{dz.toFixed(2)})
      </div>

      <div className="mt-0.5 font-mono text-[10px] text-[#a4b5ce]">
        {(r.fractionOfBrain * 100).toFixed(2)}% of brain volume
      </div>
    </button>
  )
}


export default function BottomMetricsBar() {
  const { report, sha256, mode, liveMetadata } = useStudy()
  const { maskSource, setVoxel, setOverlayMode, setIsolated } = useStore()
  const hasExpert = mode === 'demo' || Boolean(liveMetadata?.has_expert)

  const meanDice = REGIONS.reduce((a, d) => a + report[d.key].metric.dice, 0) / REGIONS.length
  const meanSens = REGIONS.reduce((a, d) => a + report[d.key].metric.sensitivity, 0) / REGIONS.length
  // HD95 is server-computed only (a boundary distance transform, not cheap enough for
  // the client's per-frame recompute) — available in live mode when an expert mask exists.
  const hd95ByRegion = mode === 'live' ? liveMetadata?.metrics : null
  const hd95Values = hd95ByRegion
    ? REGIONS.map((d) => hd95ByRegion[d.key]?.hd95_mm).filter((v): v is number => v != null)
    : []
  const meanHd95 = hd95Values.length ? hd95Values.reduce((a, v) => a + v, 0) / hd95Values.length : null

  // The largest thing the model missed, across all three regions — the single
  // most useful place to send someone who wants to check the result by eye.
  const agreement = liveMetadata?.agreement
  const biggestMiss = agreement
    ? REGIONS
        .map((d) => ({ key: d.key, ...agreement[d.key] }))
        .filter((a) => a.largest_miss_voxel && a.largest_miss_volume_ml > 0)
        .sort((a, b) => b.largest_miss_volume_ml - a.largest_miss_volume_ml)[0]
    : undefined

  const jumpToMiss = () => {
    if (!biggestMiss?.largest_miss_voxel) return
    setVoxel(biggestMiss.largest_miss_voxel as Vec3)
    setOverlayMode('agreement')
    setIsolated(null)
  }

  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-[#263854] bg-[#0a1020] shadow-lg shadow-black/30">
      <div className="flex shrink-0 items-center justify-between border-b border-[#263854] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#32d5ff" strokeWidth={2.2} className="h-4 w-4">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h2 className="text-[13px] font-bold tracking-tight text-white">
            Volumetrics &amp; Accuracy Metrics
          </h2>
        </div>
        <span className="font-mono text-[9.5px] text-[#7588a5]">
          showing {maskSource === 'expert' ? 'expert annotation' : 'model prediction'} · sha256 {sha256.slice(0, 12)}…
        </span>
      </div>

      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)_minmax(0,0.9fr)] gap-2.5 p-2.5">
        <RegionCard k="WT" />
        <RegionCard k="TC" />
        <RegionCard k="ET" />

        <Card>
          <div className="text-[12px] font-semibold text-white">Accuracy vs expert mask</div>
          {hasExpert ? (
            <div className="mt-1.5 grid grid-cols-4 gap-x-2 font-mono text-[10.5px]">
              <span className="text-[#7588a5]" />
              <span className="text-[#7588a5] font-semibold">Dice</span>
              <span className="text-[#7588a5] font-semibold">Sens.</span>
              <span className="text-[#7588a5] font-semibold" title="95th-percentile Hausdorff distance (mm)">HD95</span>
              {REGIONS.map((d) => (
                <Fragmented key={d.key} colour={d.colour} short={d.short}
                  dice={report[d.key].metric.dice} sens={report[d.key].metric.sensitivity}
                  hd95={hd95ByRegion?.[d.key]?.hd95_mm} />
              ))}
              <span className="mt-1 border-t border-[#263854] pt-1 text-[#a4b5ce] font-semibold">mean</span>
              <span className="mt-1 border-t border-[#263854] pt-1 font-bold text-[#10b981]">
                {meanDice.toFixed(3)}
              </span>
              <span className="mt-1 border-t border-[#263854] pt-1 font-bold text-[#10b981]">
                {meanSens.toFixed(3)}
              </span>
              <span className="mt-1 border-t border-[#263854] pt-1 font-bold text-[#a4b5ce]">
                {meanHd95 != null ? `${meanHd95.toFixed(1)}mm` : '—'}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 font-mono text-[10px] text-[#7588a5]">
              No expert mask was provided for this study.
            </div>
          )}

          {biggestMiss && (
            <button
              onClick={jumpToMiss}
              title="Move crosshair to largest miss"
              className="mt-2 flex w-full items-center justify-between gap-2 rounded border border-[#263854] bg-[#101a2b] px-2 py-1 text-left transition hover:border-[#f43f5e] hover:bg-[#f43f5e]/10"
            >
              <span className="truncate font-mono text-[10px] text-[#a4b5ce]">
                largest miss · {biggestMiss.key} {biggestMiss.largest_miss_volume_ml.toFixed(2)} mL
              </span>
              <span className="shrink-0 font-mono text-[10px] font-bold text-[#f43f5e]">go →</span>
            </button>
          )}
        </Card>

        <QualityCentre />
      </div>
    </div>
  )
}


function Fragmented({ colour, short, dice, sens, hd95 }: {
  colour: string; short: string; dice: number; sens: number; hd95?: number | null
}) {
  return (
    <>
      <span className="flex items-center gap-1 text-slate-400">
        <i className="inline-block h-1.5 w-1.5 rounded-[1px]" style={{ background: colour }} />
        {short}
      </span>
      <span className="text-slate-200">{dice.toFixed(3)}</span>
      <span className="text-slate-200">{sens.toFixed(3)}</span>
      <span className="text-slate-200">{hd95 != null ? `${hd95.toFixed(1)}mm` : '—'}</span>
    </>
  )
}
