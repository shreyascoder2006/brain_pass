import { create } from 'zustand'
import * as api from '../lib/api'
import type { Slot } from '../lib/sequenceDetect'
import type { SequenceName } from '../lib/volume'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface LiveState {
  status: UploadStatus
  jobId: string | null
  metadata: api.SegmentMetadata | null
  errors: api.Finding[]
  /** live pipeline stage while uploading — "validating", "segmenting", etc. */
  stage: string | null
  stageMessage: string | null
  /** bumped on every successful submit or reset, so StudyProvider knows to rebuild */
  generation: number
  /** which sample is currently running, if this run was started from the Datasets panel */
  activeSampleId: string | null
  /** slots the user placed a file into despite UploadPanel's filename-mismatch
   *  warning, keyed by the slot they assigned it to -> what the filename
   *  suggested instead. Advisory only — the backend never sees this, and it
   *  never gates or alters validation/inference, which stay all-or-nothing;
   *  it only tells the viewer which sequence view to mark as unverified. */
  sequenceWarnings: Partial<Record<SequenceName, Slot>>
  setSequenceWarnings: (w: Partial<Record<SequenceName, Slot>>) => void
  submit: (files: api.UploadFiles) => Promise<void>
  runSample: (sampleId: string) => Promise<void>
  reset: () => void
}

export const useLiveStudy = create<LiveState>((set, get) => ({
  status: 'idle',
  jobId: null,
  metadata: null,
  errors: [],
  stage: null,
  stageMessage: null,
  generation: 0,
  activeSampleId: null,
  sequenceWarnings: {},
  setSequenceWarnings: (sequenceWarnings) => set({ sequenceWarnings }),

  submit: async (files) => {
    const jobId = api.newJobId()
    set({ status: 'uploading', errors: [], jobId, stage: 'received', stageMessage: 'Uploading…', activeSampleId: null })

    let polling = true
    const poll = async () => {
      while (polling) {
        const s = await api.pollStage(jobId)
        if (s && get().jobId === jobId) set({ stage: s.stage, stageMessage: s.message })
        await new Promise((r) => setTimeout(r, 400))
      }
    }
    poll()

    try {
      const result = await api.submitStudy(jobId, files)
      polling = false
      set((s) => ({
        status: 'done', jobId: result.job_id, metadata: result.metadata, generation: s.generation + 1,
      }))
    } catch (e) {
      polling = false
      const errors = e instanceof api.ApiError
        ? e.errors
        : [{ code: 'error', sequence: null, message: (e as Error).message }]
      // A failed submit leaves the viewer on the demo phantom (mode never
      // becomes 'live'), which has no connection to this upload's mismatch —
      // the flag must not outlive the result it was meant to describe.
      set({ status: 'error', errors, sequenceWarnings: {} })
    }
  },

  runSample: async (sampleId) => {
    const jobId = api.newJobId()
    set({
      status: 'uploading', errors: [], jobId, stage: 'received', stageMessage: 'Starting…',
      activeSampleId: sampleId, sequenceWarnings: {},
    })

    let polling = true
    const poll = async () => {
      while (polling) {
        const s = await api.pollStage(jobId)
        if (s && get().jobId === jobId) set({ stage: s.stage, stageMessage: s.message })
        await new Promise((r) => setTimeout(r, 400))
      }
    }
    poll()

    try {
      const result = await api.runSample(sampleId, jobId)
      polling = false
      set((s) => ({
        status: 'done', jobId: result.job_id, metadata: result.metadata, generation: s.generation + 1,
      }))
    } catch (e) {
      polling = false
      const errors = e instanceof api.ApiError
        ? e.errors
        : [{ code: 'error', sequence: null, message: (e as Error).message }]
      // A failed submit leaves the viewer on the demo phantom (mode never
      // becomes 'live'), which has no connection to this upload's mismatch —
      // the flag must not outlive the result it was meant to describe.
      set({ status: 'error', errors, sequenceWarnings: {} })
    }
  },

  reset: () => set((s) => ({
    status: 'idle', jobId: null, metadata: null, errors: [], stage: null, stageMessage: null,
    activeSampleId: null, generation: s.generation + 1, sequenceWarnings: {},
  })),
}))
