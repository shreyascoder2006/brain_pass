import type { Mat4, Vec3 } from './volume'
import { maskBounds, smooth, surfaceNets, toWorld, type Mesh } from './surfaceNets'

/** Box-blur a binary mask inside a sub-box so the isosurface lands sub-voxel. */
function blurred(mask: Uint8Array, dims: Vec3, lo: Vec3, hi: Vec3) {
  const [nx, ny] = dims
  const w = hi[0] - lo[0], h = hi[1] - lo[1], d = hi[2] - lo[2]
  const f = new Float32Array(w * h * d)
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0
        for (let dz = -1; dz <= 1; dz++) {
          const k = lo[2] + z + dz
          if (k < 0 || k >= dims[2]) continue
          for (let dy = -1; dy <= 1; dy++) {
            const j = lo[1] + y + dy
            if (j < 0 || j >= dims[1]) continue
            const row = nx * (j + ny * k)
            for (let dx = -1; dx <= 1; dx++) {
              const i = lo[0] + x + dx
              if (i < 0 || i >= nx) continue
              if (mask[row + i]) sum++
            }
          }
        }
        f[x + w * (y + h * z)] = sum / 27
      }
    }
  }
  return (i: number, j: number, k: number) => {
    const x = i - lo[0], y = j - lo[1], z = k - lo[2]
    if (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) return 0
    return f[x + w * (y + h * z)]
  }
}

export function buildRegionMesh(
  mask: Uint8Array, dims: Vec3, affine: Mat4, smoothing = 6,
): Mesh | null {
  const b = maskBounds(mask, dims, 3)
  if (!b) return null
  const at = blurred(mask, dims, b.lo, b.hi)
  const raw = surfaceNets({ at, dims, lo: b.lo, hi: b.hi }, 0.5)
  if (raw.indices.length === 0) return null
  return toWorld(smooth(raw, smoothing, 0.55), affine)
}

/**
 * The brain shell is meshed from parenchyma (CSF excluded) at full resolution so
 * the sulci survive — a smooth ellipsoid does not read as a brain behind glass.
 */
export function buildBrainMesh(surface: Uint8Array, dims: Vec3, affine: Mat4): Mesh | null {
  return buildRegionMesh(surface, dims, affine, 1)
}

function scaleAffine(a: Mat4, s: number): Mat4 {
  const o = new Float64Array(a)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4 + c] * s
  return o
}

/**
 * A deliberately coarse copy of the same surface, used for the wireframe layer.
 * The full-resolution mesh has ~1 mm triangles, which fill in solid on screen and
 * read as nothing; stepping the grid down gives an edge spacing you can see.
 */
export function buildLatticeMesh(
  mask: Uint8Array, dims: Vec3, affine: Mat4, step: number,
): Mesh | null {
  const [nx, ny, nz] = dims
  const hx = Math.floor(nx / step), hy = Math.floor(ny / step), hz = Math.floor(nz / step)
  if (hx < 3 || hy < 3 || hz < 3) return null

  const f = new Float32Array(hx * hy * hz)
  const inv = 1 / (step * step * step)
  let x0 = hx, y0 = hy, z0 = hz, x1 = -1, y1 = -1, z1 = -1

  for (let k = 0; k < hz; k++) {
    for (let j = 0; j < hy; j++) {
      for (let i = 0; i < hx; i++) {
        let sum = 0
        for (let dz = 0; dz < step; dz++) {
          for (let dy = 0; dy < step; dy++) {
            const row = nx * ((j * step + dy) + ny * (k * step + dz))
            for (let dx = 0; dx < step; dx++) if (mask[row + i * step + dx]) sum++
          }
        }
        if (sum === 0) continue
        f[i + hx * (j + hy * k)] = sum * inv
        if (i < x0) x0 = i; if (i > x1) x1 = i
        if (j < y0) y0 = j; if (j > y1) y1 = j
        if (k < z0) z0 = k; if (k > z1) z1 = k
      }
    }
  }
  if (x1 < 0) return null

  const at = (i: number, j: number, k: number) => {
    if (i < 0 || j < 0 || k < 0 || i >= hx || j >= hy || k >= hz) return 0
    return f[i + hx * (j + hy * k)]
  }
  const lo: Vec3 = [Math.max(0, x0 - 2), Math.max(0, y0 - 2), Math.max(0, z0 - 2)]
  const hi: Vec3 = [Math.min(hx, x1 + 3), Math.min(hy, y1 + 3), Math.min(hz, z1 + 3)]
  const raw = surfaceNets({ at, dims: [hx, hy, hz], lo, hi }, 0.5)
  if (raw.indices.length === 0) return null
  return toWorld(smooth(raw, 3, 0.55), scaleAffine(affine, step))
}

export function meshCentroid(mesh: Mesh): Vec3 {
  const p = mesh.positions
  let x = 0, y = 0, z = 0
  const n = p.length / 3
  for (let i = 0; i < p.length; i += 3) { x += p[i]; y += p[i + 1]; z += p[i + 2] }
  return [x / n, y / n, z / n]
}
