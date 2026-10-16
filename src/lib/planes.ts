import type { PlaneKey } from '../state/store'
import { axisOrientation, WORLD_AXIS_LETTERS, type Mat4 } from './volume'

export interface PlaneDef {
  key: PlaneKey
  label: string
  /** voxel axis held constant by this plane */
  fixed: 0 | 1 | 2
  hAxis: 0 | 1 | 2
  /** +1 if the voxel index grows towards screen right */
  hDir: 1 | -1
  vAxis: 0 | 1 | 2
  /** +1 if the voxel index grows towards screen top */
  vDir: 1 | -1
}

export const PLANES: Record<PlaneKey, PlaneDef> = {
  axial: { key: 'axial', label: 'Axial', fixed: 2, hAxis: 0, hDir: 1, vAxis: 1, vDir: 1 },
  coronal: { key: 'coronal', label: 'Coronal', fixed: 1, hAxis: 0, hDir: 1, vAxis: 2, vDir: 1 },
  sagittal: { key: 'sagittal', label: 'Sagittal', fixed: 0, hAxis: 1, hDir: -1, vAxis: 2, vDir: 1 },
}

/** Edge letters for a plane, derived from the affine so they survive reorientation. */
export function edgeLetters(plane: PlaneDef, affine: Mat4) {
  const orient = axisOrientation(affine)
  const letterFor = (voxelAxis: number, screenDir: number) => {
    const o = orient[voxelAxis]
    const [pos, neg] = WORLD_AXIS_LETTERS[o.worldAxis]
    const sign = screenDir * (o.positive ? 1 : -1)
    return sign > 0 ? pos : neg
  }
  return {
    right: letterFor(plane.hAxis, plane.hDir),
    left: letterFor(plane.hAxis, -plane.hDir),
    top: letterFor(plane.vAxis, plane.vDir),
    bottom: letterFor(plane.vAxis, -plane.vDir),
  }
}
