import { REGIONS, type RegionKey } from '../lib/regions'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import type { Vec3 } from '../lib/volume'
import QualityCentre from './QualityCentre'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-md border border-edge bg-panel-2/60 px-3 py-2 ${className}`}>
      {children}
    </div>
  )
}

function RegionCard({ k }: { k: RegionKey }) {
  const { report, study, liveMetadata, mode } = useStudy()
  const { maskSource, setIsolated, isolated } = useStore()
  const r = report[k]
  const shown = maskSource === 'expert' ? r.expertML : r.predML
  const voxels = maskSource === 'expert' ? r.expertVoxels : r.predVoxels
  const [dx, dy, dz] = study.spacing
  const conn = mode === 'live' ? liveMetadata?.connectivity?.[k] : null
  const unc = mode === 'live' ? liveMetadata?.uncertainty?.[k] : null
  const geo = mode === 'live' ? liveMetadata?.geometry?.[k] : null

  return (
    <button
      onClick={() => setIsolated(isolated === k ? null : k)}
      className={`min-w-0 rounded-md border bg-panel-2/60 px-3 py-2 text-left transition hover:bg-panel-2 ${
        isolated === k ? 'border-sky-500/60' : 'border-edge'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: r.def.colour }} />
        <span className="truncate text-[11px] font-medium text-slate-300">
          {r.def.label} ({r.def.short})
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[19px] font-semibold leading-none text-slate-50">
          {shown.toFixed(2)}
        </span>
        <span className="text-[11px] text-slate-400">mL</span>
        {maskSource === 'predicted' && (
          <span className="ml-auto truncate font-mono text-[9.5px] text-slate-500">
            expert {r.expertML.toFixed(2)}
          </span>
        )}
      </div>
      <div className="mt-1 truncate font-mono text-[9px] leading-[1.5] text-slate-500">
        {voxels.toLocaleString()} vox × ({dx}×{dy}×{dz}) / 1000
      </div>
      <div className="truncate font-mono text-[9px] text-slate-600">
        {(r.fractionOfBrain * 100).toFixed(2)}% of brain volume
      </div>
      {conn && conn.component_count > 0 && (
        <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
          {conn.component_count === 1
            ? '● single connected mass'
            : `● ${conn.component_count} disconnected regions, largest ${(conn.largest_fraction * 100).toFixed(0)}%`}
        </div>
      )}
      {geo && geo.max_diameter_mm > 0 && (
        <div
          className="truncate font-mono text-[9px] text-slate-500"
          title={`${geo.max_diameter_definition}. Surface area: ${geo.surface_area_definition}.`}
        >
          ⌀ {geo.max_diameter_mm.toFixed(1)} mm · {Math.round(geo.surface_area_mm2).toLocaleString()} mm² surface
        </div>
      )}
      {unc && (
        <div
          className="truncate font-mono text-[9px] text-sky-500/70"
          title="Flip-TTA probability standard deviation — a measured disagreement signal, not a calibrated confidence probability. Low σ does not guarantee correctness."
        >
          confidence: mean σ {unc.mean.toFixed(3)} · boundary max σ {unc.max.toFixed(3)}
        </div>
      )}
    </button>
  )
}

export default function BottomMetricsBar() {
  const { report, sha256, mode, liveMetadata } = useStudy()
  const { maskSource, setVoxel, setOverlayMode, setIsolated } = useStore()
  const hasExpert = mode === 'demo' || Boolean(liveMetadata?.has_expert)

  const meanDice = REGIONS.reduce((a, d) => a + report[d.key].metric.dice, 0) / REGIONS.length
  const meanSens = REGIONS.reduce((a, d) => a + report[d.key].metric.sensitivity, 0) / REGIONS.length

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
    <div className="flex min-h-0 flex-col rounded-lg border border-edge bg-panel">
      <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-1.5">
        <h2 className="text-[12.5px] font-semibold tracking-tight text-slate-200">
          Volumetrics &amp; Accuracy Metrics
        </h2>
        <span className="font-mono text-[9.5px] text-slate-600">
          showing {maskSource === 'expert' ? 'expert annotation' : 'model prediction'} · sha256 {sha256.slice(0, 12)}…
        </span>
      </div>

      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.05fr)_minmax(0,0.95fr)] gap-2 p-2">
        <RegionCard k="WT" />
        <RegionCard k="TC" />
        <RegionCard k="ET" />

        <Card>
          <div className="text-[11px] font-medium text-slate-300">Accuracy vs expert mask</div>
          {hasExpert ? (
            <div className="mt-1 grid grid-cols-3 gap-x-2 font-mono text-[10px]">
              <span className="text-slate-600" />
              <span className="text-slate-500">Dice</span>
              <span className="text-slate-500">Sens.</span>
              {REGIONS.map((d) => (
                <Fragmented key={d.key} colour={d.colour} short={d.short}
                  dice={report[d.key].metric.dice} sens={report[d.key].metric.sensitivity} />
              ))}
              <span className="mt-0.5 border-t border-edge pt-0.5 text-slate-400">mean</span>
              <span className="mt-0.5 border-t border-edge pt-0.5 font-semibold text-emerald-400">
                {meanDice.toFixed(3)}
              </span>
              <span className="mt-0.5 border-t border-edge pt-0.5 font-semibold text-emerald-400">
                {meanSens.toFixed(3)}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 font-mono text-[10px] text-slate-500">
              No expert mask was provided for this study.
            </div>
          )}

          {biggestMiss && (
            <button
              onClick={jumpToMiss}
              title="Move the crosshair to the centre of the largest region the expert marked and the model did not, and switch the slice views to the agreement overlay."
              className="mt-1.5 flex w-full items-center justify-between gap-2 rounded border border-edge px-1.5 py-1 text-left transition hover:border-rose-500/50 hover:bg-rose-500/5"
            >
              <span className="truncate font-mono text-[9.5px] text-slate-400">
                largest miss · {biggestMiss.key} {biggestMiss.largest_miss_volume_ml.toFixed(2)} mL
              </span>
              <span className="shrink-0 font-mono text-[9.5px] text-rose-400">go →</span>
            </button>
          )}
        </Card>

        <QualityCentre />
      </div>
    </div>
  )
}

function Fragmented({ colour, short, dice, sens }: {
  colour: string; short: string; dice: number; sens: number
}) {
  return (
    <>
      <span className="flex items-center gap-1 text-slate-400">
        <i className="inline-block h-1.5 w-1.5 rounded-[1px]" style={{ background: colour }} />
        {short}
      </span>
      <span className="text-slate-200">{dice.toFixed(3)}</span>
      <span className="text-slate-200">{sens.toFixed(3)}</span>
    </>
  )
}
