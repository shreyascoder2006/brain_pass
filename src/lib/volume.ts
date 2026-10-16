export type Vec3 = [number, number, number]
export type Mat4 = Float64Array

export interface ScalarVolume {
  data: Uint8Array
  dims: Vec3
  spacing: Vec3
  /** 4x4 row-major, maps voxel (i,j,k) -> world (x,y,z) in mm, RAS+ */
  affine: Mat4
}

export type SequenceName = 'T1' | 'T1Gd' | 'T2' | 'FLAIR'
export const SEQUENCES: SequenceName[] = ['T1', 'T1Gd', 'T2', 'FLAIR']

export function makeAffine(spacing: Vec3, dims: Vec3): Mat4 {
  // Centre the volume on the world origin, RAS+: +x Right, +y Anterior, +z Superior
  const [sx, sy, sz] = spacing
  const cx = ((dims[0] - 1) * sx) / 2
  const cy = ((dims[1] - 1) * sy) / 2
  const cz = ((dims[2] - 1) * sz) / 2
  return new Float64Array([sx, 0, 0, -cx, 0, sy, 0, -cy, 0, 0, sz, -cz, 0, 0, 0, 1])
}

export function voxelToWorld(a: Mat4, i: number, j: number, k: number): Vec3 {
  return [
    a[0] * i + a[1] * j + a[2] * k + a[3],
    a[4] * i + a[5] * j + a[6] * k + a[7],
    a[8] * i + a[9] * j + a[10] * k + a[11],
  ]
}

export function invertAffine(a: Mat4): Mat4 {
  const m = [
    [a[0], a[1], a[2]],
    [a[4], a[5], a[6]],
    [a[8], a[9], a[10]],
  ]
  const t = [a[3], a[7], a[11]]
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const inv = [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det,
    ],
    [
      (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det,
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det,
    ],
  ]
  const it = [
    -(inv[0][0] * t[0] + inv[0][1] * t[1] + inv[0][2] * t[2]),
    -(inv[1][0] * t[0] + inv[1][1] * t[1] + inv[1][2] * t[2]),
    -(inv[2][0] * t[0] + inv[2][1] * t[1] + inv[2][2] * t[2]),
  ]
  return new Float64Array([
    inv[0][0], inv[0][1], inv[0][2], it[0],
    inv[1][0], inv[1][1], inv[1][2], it[1],
    inv[2][0], inv[2][1], inv[2][2], it[2],
    0, 0, 0, 1,
  ])
}

export function worldToVoxel(inv: Mat4, x: number, y: number, z: number): Vec3 {
  return [
    inv[0] * x + inv[1] * y + inv[2] * z + inv[3],
    inv[4] * x + inv[5] * y + inv[6] * z + inv[7],
    inv[8] * x + inv[9] * y + inv[10] * z + inv[11],
  ]
}

/**
 * Which world axis each voxel axis most closely follows, and its polarity.
 * Drives the L/R, A/P, S/I labels so they stay correct if the affine changes.
 */
export function axisOrientation(a: Mat4) {
  const cols: Vec3[] = [
    [a[0], a[4], a[8]],
    [a[1], a[5], a[9]],
    [a[2], a[6], a[10]],
  ]
  return cols.map((c) => {
    let best = 0
    for (let i = 1; i < 3; i++) if (Math.abs(c[i]) > Math.abs(c[best])) best = i
    return { worldAxis: best, positive: c[best] >= 0 }
  })
}

/** Positive-direction anatomical letter for each world axis in RAS+. */
export const WORLD_AXIS_LETTERS: [string, string][] = [
  ['R', 'L'],
  ['A', 'P'],
  ['S', 'I'],
]

export function sampleNearest(v: ScalarVolume, i: number, j: number, k: number): number {
  const [nx, ny, nz] = v.dims
  i = Math.round(i); j = Math.round(j); k = Math.round(k)
  if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return 0
  return v.data[i + nx * (j + ny * k)]
}

export function clampVoxel(dims: Vec3, v: Vec3): Vec3 {
  return [
    Math.min(dims[0] - 1, Math.max(0, Math.round(v[0]))),
    Math.min(dims[1] - 1, Math.max(0, Math.round(v[1]))),
    Math.min(dims[2] - 1, Math.max(0, Math.round(v[2]))),
  ]
}

export function voxelVolumeMm3(spacing: Vec3): number {
  return spacing[0] * spacing[1] * spacing[2]
}
