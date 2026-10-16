import { REGIONS, type RegionKey } from '../lib/regions'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'

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
  const { maskSource } = useStore()
  const hasExpert = mode === 'demo' || Boolean(liveMetadata?.has_expert)
  const warnings = liveMetadata?.warnings ?? []

  const meanDice = REGIONS.reduce((a, d) => a + report[d.key].metric.dice, 0) / REGIONS.length
  const meanSens = REGIONS.reduce((a, d) => a + report[d.key].metric.sensitivity, 0) / REGIONS.length

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
        </Card>

        {warnings.length === 0 ? (
          <div className="flex min-w-0 items-center gap-2.5 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.4}
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-[10.5px] text-emerald-200/80">Input Validation</div>
              <div className="text-[17px] font-semibold leading-tight text-emerald-400">PASS</div>
              <div className="truncate font-mono text-[9px] text-emerald-200/50">
                {mode === 'live' ? '4/4 sequences · shapes & affines match' : 'demo phantom · synthetic study'}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex min-w-0 items-center gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2"
            title={warnings.map((w) => w.message).join('\n')}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.4}
                strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 9v4m0 4h.01M10.3 3.9L2.5 17a1 1 0 00.9 1.5h17.2a1 1 0 00.9-1.5L13.7 3.9a1 1 0 00-1.74 0z" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-[10.5px] text-amber-200/80">Input Validation</div>
              <div className="text-[17px] font-semibold leading-tight text-amber-400">PASS · {warnings.length} warning{warnings.length > 1 ? 's' : ''}</div>
              <div className="truncate font-mono text-[9px] text-amber-200/50">{warnings[0].message}</div>
            </div>
          </div>
        )}
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
