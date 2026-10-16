/** Turns a completed backend job into the same `Study` shape the phantom generator produces,
 * so the existing meshing / MPR / metrics pipeline renders real data with no changes of its own. */

import * as api from './api'
import type { Study } from './phantom'
import type { Mat4, ScalarVolume, SequenceName, Vec3 } from './volume'
import { SEQUENCES } from './volume'

export async function buildLiveStudy(jobId: string, metadata: api.SegmentMetadata): Promise<Study> {
  const dims = metadata.dims as Vec3
  const spacing = metadata.spacing as Vec3
  const affine = new Float64Array(metadata.affine) as Mat4
  const total = dims[0] * dims[1] * dims[2]

  const sequenceBytes = await Promise.all(SEQUENCES.map((name) => api.fetchVolume(jobId, name)))
  const sequences = {} as Record<SequenceName, ScalarVolume>
  SEQUENCES.forEach((name, i) => {
    sequences[name] = { data: sequenceBytes[i], dims, spacing, affine }
  })

  const predicted = await api.fetchLabels(jobId)
  const expert = metadata.has_expert ? await api.fetchExpertLabels(jobId) : new Uint8Array(total)

  // No separate parenchyma/CSF classification is available from a live upload, so the
  // T1 foreground (already zeroed outside the head by the backend's normalisation) stands
  // in for both the volume denominator and the mesh-shell mask.
  const t1 = sequences.T1.data
  const brain = new Uint8Array(total)
  for (let i = 0; i < total; i++) brain[i] = t1[i] !== 0 ? 1 : 0

  return {
    dims, spacing, affine, sequences, expert, predicted,
    brain, surface: brain,
    caseId: `Live study ${jobId.slice(0, 8)}`,
  }
}
