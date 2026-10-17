import { useEffect, useRef, useState } from 'react'
import * as api from '../lib/api'
import { autoSortFiles, detectSlot, type Slot } from '../lib/sequenceDetect'
import { useLiveStudy } from '../state/liveStudy'
import { useStore } from '../state/store'
import { useWorkspaceStore } from '../state/workspaceStore'

const PIPELINE = ['received', 'validating', 'resampling', 'segmenting', 'measuring', 'meshing', 'reporting', 'done']

const REQUIRED: { key: Slot; label: string; hint: string }[] = [
  { key: 'T1', label: 'T1', hint: 'native T1-weighted' },
  { key: 'T1Gd', label: 'T1Gd', hint: 'post-contrast T1' },
  { key: 'T2', label: 'T2', hint: 'T2-weighted' },
  { key: 'FLAIR', label: 'FLAIR', hint: 'fluid-attenuated' },
]

function Dropzone({
  slot, label, hint, file, onPick, optional = false,
}: {
  slot: Slot; label: string; hint: string; file: File | null
  onPick: (f: File | null) => void; optional?: boolean
}) {
  const [over, setOver] = useState(false)
  const inputId = `upload-${slot}`

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onPick(f)
      }}
      className={`flex min-w-0 cursor-pointer flex-col gap-1 rounded-md border px-3 py-2.5 transition ${
        over ? 'border-sky-400 bg-sky-500/10'
        : file ? 'border-emerald-600/50 bg-emerald-500/5'
        : 'border-edge bg-panel-2/60 hover:border-slate-500'
      }`}
    >
      <input
        id={inputId}
        type="file"
        accept=".nii,.gz"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11.5px] font-semibold text-slate-200">
          {label} {optional && <span className="text-slate-500">(optional)</span>}
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(null) }}
            className="text-[10px] text-slate-500 hover:text-rose-400"
          >
            clear
          </button>
        )}
      </div>
      <span className="truncate font-mono text-[10px] text-slate-500">{hint}</span>
      <span className={`truncate font-mono text-[10px] ${file ? 'text-emerald-400' : 'text-slate-600'}`}>
        {file ? file.name : 'drop .nii / .nii.gz or click to browse'}
      </span>
      {file && (() => {
        const guess = detectSlot(file.name)
        return guess && guess !== slot ? (
          <span className="truncate font-mono text-[9.5px] text-amber-400/80">
            filename looks like {guess} — double-check this slot
          </span>
        ) : null
      })()}
    </label>
  )
}

export default function UploadPanel() {
  const open = useStore((s) => s.uploadOpen)
  const setOpen = useStore((s) => s.setUploadOpen)
  const { status, errors, stage, stageMessage, submit, reset, setSequenceWarnings } = useLiveStudy()
  const [files, setFiles] = useState<Record<Slot, File | null>>({
    T1: null, T1Gd: null, T2: null, FLAIR: null, expert: null,
  })
  const [serverStatus, setServerStatus] = useState<{ ok: boolean; modelReady: boolean; message: string } | null>(null)
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [bulkOver, setBulkOver] = useState(false)
  // Set once the user clicks "Run segmentation" with a filename mismatch still
  // in place, and cleared the moment any file changes — a second click on the
  // (now-relabelled) button is what actually submits.
  const [confirmedMismatch, setConfirmedMismatch] = useState(false)
  const checkedOnce = useRef(false)

  const applyAutoSort = (picked: File[]) => {
    const { assigned, unmatched: rest } = autoSortFiles(picked)
    if (Object.keys(assigned).length > 0) {
      setFiles((s) => ({ ...s, ...assigned }))
    }
    setUnmatched(rest.map((f) => f.name))
    setConfirmedMismatch(false)
  }

  const setFile = (slot: Slot, f: File | null) => {
    setFiles((s) => ({ ...s, [slot]: f }))
    setConfirmedMismatch(false)
  }

  // Filename-only heuristic (see lib/sequenceDetect) against each file actually
  // placed in a required slot. Never blocks a result or touches the backend —
  // it's advisory, surfaced before the run and again on the flagged view after.
  const mismatches: Partial<Record<Slot, Slot>> = {}
  for (const r of REQUIRED) {
    const file = files[r.key]
    if (!file) continue
    const guess = detectSlot(file.name)
    if (guess && guess !== r.key) mismatches[r.key] = guess
  }
  const hasMismatch = Object.keys(mismatches).length > 0

  useEffect(() => {
    if (!open || checkedOnce.current) return
    checkedOnce.current = true
    api.health().then((h) => {
      setServerStatus(
        h
          ? { ok: true, modelReady: h.model_ready, message: h.model_ready ? h.model_name : 'running on the pipeline smoke-test model — download the MONAI bundle for real inference' }
          : { ok: false, modelReady: false, message: 'cannot reach the local server at http://127.0.0.1:8008 — start it with uvicorn server.main:app' },
      )
    })
  }, [open])

  useEffect(() => {
    if (status !== 'done') return
    useWorkspaceStore.getState().setActiveWorkspace('viewer')
    const t = setTimeout(() => setOpen(false), 900)
    return () => clearTimeout(t)
  }, [status, setOpen])

  if (!open) return null

  const ready = files.T1 && files.T1Gd && files.T2 && files.FLAIR

  const run = () => {
    if (!ready) return
    if (hasMismatch && !confirmedMismatch) {
      setConfirmedMismatch(true)
      return
    }
    setSequenceWarnings(confirmedMismatch ? mismatches : {})
    submit({
      T1: files.T1!, T1Gd: files.T1Gd!, T2: files.T2!, FLAIR: files.FLAIR!,
      ...(files.expert ? { expert: files.expert } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl rounded-lg border border-edge bg-panel p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-semibold text-slate-100">Upload a study</h2>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200">✕</button>
        </div>

        <p className="mb-3 font-mono text-[10px] leading-relaxed text-slate-500">
          Research and teaching prototype only. Suspected tumour regions predicted by the model;
          estimated volumes only. Processing is entirely local — nothing leaves this machine.
        </p>

        {serverStatus && (
          <div className={`mb-3 rounded-md border px-2.5 py-1.5 font-mono text-[10px] ${
            serverStatus.ok
              ? serverStatus.modelReady ? 'border-emerald-600/40 text-emerald-300' : 'border-amber-600/40 text-amber-300'
              : 'border-rose-600/40 text-rose-300'
          }`}>
            {serverStatus.message}
          </div>
        )}

        <label
          onDragOver={(e) => { e.preventDefault(); setBulkOver(true) }}
          onDragLeave={() => setBulkOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setBulkOver(false)
            applyAutoSort(Array.from(e.dataTransfer.files ?? []))
          }}
          className={`mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2.5 transition ${
            bulkOver ? 'border-sky-400 bg-sky-500/10' : 'border-edge/70 bg-panel-2/30 hover:border-slate-500'
          }`}
        >
          <input
            type="file" multiple accept=".nii,.gz" className="hidden"
            onChange={(e) => { applyAutoSort(Array.from(e.target.files ?? [])); e.target.value = '' }}
          />
          <span className="font-mono text-[10.5px] text-slate-400">
            Drop all files at once — sorted by filename into the right slot below
          </span>
        </label>
        {unmatched.length > 0 && (
          <div className="mb-2 rounded-md border border-amber-600/40 bg-amber-500/5 px-2.5 py-1.5 font-mono text-[10px] text-amber-300">
            Couldn't guess a slot from: {unmatched.join(', ')} — drag {unmatched.length === 1 ? 'it' : 'them'} into the right box manually.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {REQUIRED.map((r) => (
            <Dropzone key={r.key} slot={r.key} label={r.label} hint={r.hint}
              file={files[r.key]} onPick={(f) => setFile(r.key, f)} />
          ))}
        </div>
        <div className="mt-2">
          <Dropzone slot="expert" label="Expert mask" hint="BraTS codes 1/2/4, optional"
            file={files.expert} onPick={(f) => setFile('expert', f)} optional />
        </div>

        {hasMismatch && confirmedMismatch && status !== 'uploading' && (
          <div className="mt-2 space-y-1 rounded-md border border-amber-600/50 bg-amber-500/10 px-2.5 py-2">
            <div className="text-[11px] font-semibold text-amber-300">
              Filename mismatch{Object.keys(mismatches).length > 1 ? 'es' : ''} — click "Run anyway" to proceed
            </div>
            {Object.entries(mismatches).map(([slot, guess]) => (
              <div key={slot} className="font-mono text-[10px] text-amber-200/80">
                {slot} slot: filename looks like {guess}
              </div>
            ))}
            <div className="font-mono text-[10px] text-amber-200/60">
              The model reads all four sequences together — if one is mislabelled, the whole result
              is unverified, not just that view. The flagged sequence will be marked invalid in the
              viewer instead of shown.
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="mt-3 rounded-md border border-sky-600/40 bg-sky-500/5 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
              <span className="font-mono text-[11px] text-sky-300">{stageMessage ?? 'Starting…'}</span>
            </div>
            <div className="mt-2 flex gap-1">
              {PIPELINE.map((s) => {
                const i = PIPELINE.indexOf(s)
                const current = PIPELINE.indexOf(stage ?? 'received')
                return (
                  <span key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= current ? 'bg-sky-400' : 'bg-slate-700'
                  }`} />
                )
              })}
            </div>
          </div>
        )}

        {status === 'error' && errors.length > 0 && (
          <div className="mt-3 space-y-1 rounded-md border border-rose-600/40 bg-rose-500/5 px-2.5 py-2">
            <div className="text-[11px] font-medium text-rose-300">Input rejected — no result was produced.</div>
            {errors.map((e, i) => (
              <div key={i} className="font-mono text-[10px] text-rose-200/80">
                [{e.code}{e.sequence ? `:${e.sequence}` : ''}] {e.message}
              </div>
            ))}
          </div>
        )}

        {status === 'done' && (
          <div className="mt-3 rounded-md border border-emerald-600/40 bg-emerald-500/5 px-2.5 py-2 font-mono text-[10.5px] text-emerald-300">
            Segmentation complete — rendering the live study.
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              reset()
              setFiles({ T1: null, T1Gd: null, T2: null, FLAIR: null, expert: null })
              setUnmatched([])
              setConfirmedMismatch(false)
            }}
            className="font-mono text-[10.5px] text-slate-500 hover:text-slate-300"
          >
            back to demo phantom
          </button>
          <button
            onClick={run}
            disabled={!ready || status === 'uploading'}
            className={`rounded-md border px-3.5 py-1.5 text-[11.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              hasMismatch && confirmedMismatch
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'border-sky-500/50 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
            }`}
          >
            {status === 'uploading' ? 'Processing…' : hasMismatch && confirmedMismatch ? 'Run anyway' : 'Run segmentation'}
          </button>
        </div>
      </div>
    </div>
  )
}
