import { useState } from 'react'
import type { Finding } from '../lib/api'
import { useStudy } from '../state/study'

type Status = 'pass' | 'review' | 'n/a'

interface Check {
  name: string
  detail: string
  status: Status
  /** Validator codes that downgrade this check, so the mapping from a real
   *  warning to the line it lands on is explicit rather than guessed. */
  codes: string[]
}

/** Everything fatal is pass-by-construction: validation is all-or-nothing, so a
 *  study that produced a result cleared every blocking check. Only the
 *  non-fatal heuristics can come back as "review", and they do so with the
 *  validator's own message rather than a rephrasing of it. */
function buildChecks(warnings: Finding[], live: boolean, sequenceCount: number): Check[] {
  const defs: Omit<Check, 'status'>[] = [
    {
      name: 'Study completeness',
      detail: live ? `${sequenceCount} of 4 sequences accepted` : 'synthetic phantom — nothing was uploaded',
      codes: ['incomplete_set'],
    },
    {
      name: 'File integrity',
      detail: 'readable NIfTI, within the 1 GB per-file limit',
      codes: ['unreadable', 'too_large', 'bad_extension'],
    },
    {
      name: 'Volume structure',
      detail: 'all volumes 3D, none constant or all-zero',
      codes: ['not_3d', 'constant'],
    },
    {
      name: 'Voxel values',
      detail: 'no NaN or infinite voxels',
      codes: ['not_finite'],
    },
    {
      name: 'Spatial alignment',
      detail: 'shapes and affines agree across all four sequences',
      codes: ['shape_mismatch', 'affine_mismatch', 'invalid_affine'],
    },
    {
      name: 'Brain content',
      detail: 'skull-strip and head-shape heuristics',
      codes: ['not_skull_stripped', 'out_of_distribution'],
    },
    {
      name: 'Field of view',
      detail: 'physical extent and boundary contact plausible for a head',
      codes: ['implausible_fov', 'touches_boundary'],
    },
  ]

  return defs.map((d) => ({
    ...d,
    status: warnings.some((w) => d.codes.includes(w.code))
      ? 'review'
      : live ? 'pass' : d.name === 'Study completeness' ? 'n/a' : 'pass',
  }))
}

const DOT: Record<Status, string> = {
  pass: 'bg-emerald-400',
  review: 'bg-amber-400',
  'n/a': 'bg-slate-600',
}

export default function QualityCentre() {
  const { mode, liveMetadata } = useStudy()
  const [open, setOpen] = useState(false)

  const live = mode === 'live'
  const warnings = liveMetadata?.warnings ?? []
  const sequenceCount = Object.keys(liveMetadata?.input_sha256 ?? {}).length || 4
  const checks = buildChecks(warnings, live, sequenceCount)
  const flagged = checks.filter((c) => c.status === 'review')

  return (
    <div
      className={`relative flex min-w-0 flex-col justify-center rounded-md border px-3 py-2 transition-colors ${
        flagged.length
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-emerald-600/40 bg-emerald-500/10'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            flagged.length ? 'bg-amber-500/20' : 'bg-emerald-500/20'
          }`}
        >
          {flagged.length ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.4}
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 9v4m0 4h.01M10.3 3.9L2.5 17a1 1 0 00.9 1.5h17.2a1 1 0 00.9-1.5L13.7 3.9a1 1 0 00-1.74 0z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.4}
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[10.5px] ${flagged.length ? 'text-amber-200/80' : 'text-emerald-200/80'}`}>
            Input Validation
          </span>
          <span className={`block text-[17px] font-semibold leading-tight ${
            flagged.length ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            PASS{flagged.length ? ` · ${flagged.length} to review` : ''}
          </span>
          <span className={`block truncate font-mono text-[9px] ${
            flagged.length ? 'text-amber-200/50' : 'text-emerald-200/50'
          }`}>
            {live ? `${checks.length} checks run` : 'demo phantom · synthetic study'}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Floated rather than inline: the 3D view is the point of this screen
          and must not be squeezed to read a validation detail. */}
      {open && (
        <ul
          className="absolute bottom-full right-0 z-30 mb-2 max-h-[52vh] w-[22rem] space-y-1 overflow-y-auto
                     rounded-md border border-edge bg-panel p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.75)]"
        >
          <li className="mb-1 flex items-baseline justify-between border-b border-edge pb-1.5">
            <span className="text-[11px] font-medium text-slate-200">Input validation detail</span>
            <span className="font-mono text-[9px] text-slate-500">
              {live ? 'this study' : 'synthetic phantom'}
            </span>
          </li>
          {checks.map((c) => {
            const hit = warnings.find((w) => c.codes.includes(w.code))
            return (
              <li key={c.name} className="flex items-start gap-2">
                <i className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[c.status]}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[10.5px] text-slate-200">{c.name}</span>
                    <span className={`shrink-0 font-mono text-[9px] uppercase ${
                      c.status === 'review' ? 'text-amber-400'
                        : c.status === 'n/a' ? 'text-slate-500' : 'text-emerald-400/80'
                    }`}>
                      {c.status === 'n/a' ? 'n/a' : c.status}
                    </span>
                  </span>
                  <span className="block font-mono text-[9px] leading-relaxed text-slate-500">
                    {hit ? hit.message : c.detail}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
