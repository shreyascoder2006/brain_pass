import { create } from 'zustand'
import * as api from '../lib/api'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface LiveState {
  status: UploadStatus
  jobId: string | null
  metadata: api.SegmentMetadata | null
  errors: api.Finding[]
  /** bumped on every successful submit or reset, so StudyProvider knows to rebuild */
  generation: number
  submit: (files: api.UploadFiles) => Promise<void>
  reset: () => void
}

export const useLiveStudy = create<LiveState>((set) => ({
  status: 'idle',
  jobId: null,
  metadata: null,
  errors: [],
  generation: 0,

  submit: async (files) => {
    set({ status: 'uploading', errors: [] })
    try {
      const result = await api.submitStudy(files)
      set((s) => ({
        status: 'done', jobId: result.job_id, metadata: result.metadata, generation: s.generation + 1,
      }))
    } catch (e) {
      const errors = e instanceof api.ApiError
        ? e.errors
        : [{ code: 'error', sequence: null, message: (e as Error).message }]
      set({ status: 'error', errors })
    }
  },

  reset: () => set((s) => ({
    status: 'idle', jobId: null, metadata: null, errors: [], generation: s.generation + 1,
  })),
}))
