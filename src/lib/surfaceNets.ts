import type { Mat4, Vec3 } from './volume'
import { voxelToWorld } from './volume'

export interface Mesh {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

export interface Field {
  /** scalar value at voxel (i,j,k) */
  at: (i: number, j: number, k: number) => number
  dims: Vec3
  /** inclusive-exclusive voxel bounds to mesh within */
  lo: Vec3
  hi: Vec3
}

const CORNER_OFFSET: Vec3[] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
]
// corner bit c: x = c&1, y = (c>>1)&1, z = (c>>2)&1
const EDGE_PAIRS: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
]

/**
 * Naive surface nets. Produces one vertex per boundary cell placed at the mean
 * of the iso-crossings on that cell's edges, then stitches quads across every
 * sign-changing edge. Smooth enough for anatomy without a marching-cubes table.
 */
export function surfaceNets(field: Field, iso: number): Mesh {
  const { at, lo, hi } = field
  const nx = hi[0] - lo[0]
  const ny = hi[1] - lo[1]
  const nz = hi[2] - lo[2]
  if (nx < 2 || ny < 2 || nz < 2) {
    return { positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0) }
  }

  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const verts: number[] = []
  const corner = new Float64Array(8)

  const cidx = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z)

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          const o = CORNER_OFFSET[c]
          const v = at(lo[0] + x + o[0], lo[1] + y + o[1], lo[2] + z + o[2])
          corner[c] = v
          if (v < iso) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue

        let sx = 0, sy = 0, sz = 0, n = 0
        for (let e = 0; e < 12; e++) {
          const [a, b] = EDGE_PAIRS[e]
          const va = corner[a]
          const vb = corner[b]
          if ((va < iso) === (vb < iso)) continue
          let t = (iso - va) / (vb - va)
          if (!isFinite(t)) t = 0.5
          t = Math.min(1, Math.max(0, t))
          const oa = CORNER_OFFSET[a]
          const ob = CORNER_OFFSET[b]
          sx += oa[0] + t * (ob[0] - oa[0])
          sy += oa[1] + t * (ob[1] - oa[1])
          sz += oa[2] + t * (ob[2] - oa[2])
          n++
        }
        if (n === 0) continue

        cellIndex[cidx(x, y, z)] = verts.length / 3
        verts.push(lo[0] + x + sx / n, lo[1] + y + sy / n, lo[2] + z + sz / n)
      }
    }
  }

  const tris: number[] = []
  // Cells sharing the axis-d edge that starts at this cell's corner 0.
  const NEIGHBOURS: [number, number, number][][] = [
    [[0, 0, 0], [0, -1, 0], [0, -1, -1], [0, 0, -1]],
    [[0, 0, 0], [0, 0, -1], [-1, 0, -1], [-1, 0, 0]],
    [[0, 0, 0], [-1, 0, 0], [-1, -1, 0], [0, -1, 0]],
  ]

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        if (cellIndex[cidx(x, y, z)] < 0) continue
        const v0 = at(lo[0] + x, lo[1] + y, lo[2] + z) < iso
        for (let d = 0; d < 3; d++) {
          const o = CORNER_OFFSET[1 << d]
          const v1 = at(lo[0] + x + o[0], lo[1] + y + o[1], lo[2] + z + o[2]) < iso
          if (v0 === v1) continue
          // The other two axes must have room for the back-neighbours.
          const a1 = (d + 1) % 3
          const a2 = (d + 2) % 3
          const c = [x, y, z]
          if (c[a1] === 0 || c[a2] === 0) continue

          const quad: number[] = []
          let ok = true
          for (const nb of NEIGHBOURS[d]) {
            const idx = cellIndex[cidx(x + nb[0], y + nb[1], z + nb[2])]
            if (idx < 0) { ok = false; break }
            quad.push(idx)
          }
          if (!ok) continue

          if (v0) {
            tris.push(quad[0], quad[1], quad[2], quad[0], quad[2], quad[3])
          } else {
            tris.push(quad[0], quad[2], quad[1], quad[0], quad[3], quad[2])
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(verts),
    normals: new Float32Array(verts.length),
    indices: new Uint32Array(tris),
  }
}

/** Laplacian smoothing in voxel space; keeps the shell from looking faceted. */
export function smooth(mesh: Mesh, iterations: number, factor = 0.5): Mesh {
  const { positions, indices } = mesh
  const n = positions.length / 3
  if (n === 0) return mesh

  const neighbourStart = new Uint32Array(n + 1)
  const pairs: number[] = []
  const seen = new Set<number>()
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = indices[t + e]
      const b = indices[t + ((e + 1) % 3)]
      const key = a < b ? a * n + b : b * n + a
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push(a, b)
    }
  }
  for (let p = 0; p < pairs.length; p += 2) {
    neighbourStart[pairs[p]]++
    neighbourStart[pairs[p + 1]]++
  }
  let acc = 0
  for (let i = 0; i <= n; i++) {
    const c = i < n ? neighbourStart[i] : 0
    neighbourStart[i] = acc
    acc += c
  }
  const cursor = Uint32Array.from(neighbourStart)
  const neighbours = new Uint32Array(acc)
  for (let p = 0; p < pairs.length; p += 2) {
    neighbours[cursor[pairs[p]]++] = pairs[p + 1]
    neighbours[cursor[pairs[p + 1]]++] = pairs[p]
  }

  let src: typeof positions = positions
  let dst: typeof positions = new Float32Array(positions.length)
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const s = neighbourStart[i]
      const e = neighbourStart[i + 1]
      const count = e - s
      if (count === 0) {
        dst[i * 3] = src[i * 3]
        dst[i * 3 + 1] = src[i * 3 + 1]
        dst[i * 3 + 2] = src[i * 3 + 2]
        continue
      }
      let ax = 0, ay = 0, az = 0
      for (let q = s; q < e; q++) {
        const j = neighbours[q]
        ax += src[j * 3]; ay += src[j * 3 + 1]; az += src[j * 3 + 2]
      }
      ax /= count; ay /= count; az /= count
      dst[i * 3] = src[i * 3] + factor * (ax - src[i * 3])
      dst[i * 3 + 1] = src[i * 3 + 1] + factor * (ay - src[i * 3 + 1])
      dst[i * 3 + 2] = src[i * 3 + 2] + factor * (az - src[i * 3 + 2])
    }
    const tmp = src
    src = dst
    dst = tmp === positions ? new Float32Array(positions.length) : tmp
  }

  return { positions: src, normals: mesh.normals, indices: mesh.indices }
}

/** Map vertices from voxel space into world millimetres and compute normals. */
export function toWorld(mesh: Mesh, affine: Mat4): Mesh {
  const p = mesh.positions
  const out = new Float32Array(p.length)
  for (let i = 0; i < p.length; i += 3) {
    const w = voxelToWorld(affine, p[i], p[i + 1], p[i + 2])
    out[i] = w[0]; out[i + 1] = w[1]; out[i + 2] = w[2]
  }
  const normals = new Float32Array(p.length)
  const idx = mesh.indices
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3
    const ux = out[b] - out[a], uy = out[b + 1] - out[a + 1], uz = out[b + 2] - out[a + 2]
    const vx = out[c] - out[a], vy = out[c + 1] - out[a + 1], vz = out[c + 2] - out[a + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz
    normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz
    normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l
  }
  return { positions: out, normals, indices: mesh.indices }
}

/** Tight voxel bounding box of a binary mask, padded so the surface closes. */
export function maskBounds(mask: Uint8Array, dims: Vec3, pad = 2): { lo: Vec3; hi: Vec3 } | null {
  const [nx, ny, nz] = dims
  let x0 = nx, y0 = ny, z0 = nz, x1 = -1, y1 = -1, z1 = -1
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      const row = nx * (j + ny * k)
      for (let i = 0; i < nx; i++) {
        if (mask[row + i] === 0) continue
        if (i < x0) x0 = i; if (i > x1) x1 = i
        if (j < y0) y0 = j; if (j > y1) y1 = j
        if (k < z0) z0 = k; if (k > z1) z1 = k
      }
    }
  }
  if (x1 < 0) return null
  return {
    lo: [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.max(0, z0 - pad)],
    hi: [Math.min(nx, x1 + pad + 1), Math.min(ny, y1 + pad + 1), Math.min(nz, z1 + pad + 1)],
  }
}
