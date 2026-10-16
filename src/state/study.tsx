import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildBrainMesh, buildLatticeMesh, buildRegionMesh } from '../lib/meshing'
import { generateStudy, type Study } from '../lib/phantom'
import { buildReport, countVoxels, REGIONS, regionMask, type RegionKey, type RegionReport } from '../lib/regions'
import { maskBounds, type Mesh } from '../lib/surfaceNets'
import { invertAffine, type Vec3 } from '../lib/volume'
import type { MaskSource } from './store'

export interface StudyBundle {
  study: Study
  brainMesh: Mesh | null
  brainLattice: Mesh | null
  meshes: Record<MaskSource, Record<RegionKey, Mesh | null>>
  lattices: Record<MaskSource, Record<RegionKey, Mesh | null>>
  masks: Record<MaskSource, Record<RegionKey, Uint8Array>>
  report: Record<RegionKey, RegionReport>
  brainVoxels: number
  /** voxel bounds of the head, so slice views frame the anatomy not the air */
  crop: { lo: Vec3; hi: Vec3 }
  inverseAffine: Float64Array
  sha256: string
  builtAt: string
}

const Ctx = createContext<StudyBundle | null>(null)

export function useStudy(): StudyBundle {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStudy outside provider')
  return v
}

export function useStudyOptional() {
  return useContext(Ctx)
}

/** Stable digest of the generated volumes, standing in for the input file hash. */
async function digest(study: Study): Promise<string> {
  const parts = [study.sequences.T1.data, study.sequences.T1Gd.data, study.expert]
  const len = parts.reduce((a, p) => a + Math.ceil(p.length / 997), 0)
  const sample = new Uint8Array(len)
  let o = 0
  for (const p of parts) for (let i = 0; i < p.length; i += 997) sample[o++] = p[i]
  const buf = await crypto.subtle.digest('SHA-256', sample)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function StudyProvider({ children, fallback }: { children: ReactNode; fallback: (stage: string) => ReactNode }) {
  const [bundle, setBundle] = useState<StudyBundle | null>(null)
  const [stage, setStage] = useState('Generating study volumes')

  useEffect(() => {
    let cancelled = false
    const step = (label: string) => new Promise<void>((r) => {
      setStage(label)
      setTimeout(r, 16)
    })

    ;(async () => {
      await step('Generating study volumes')
      const study = generateStudy()
      if (cancelled) return

      await step('Deriving WT / TC / ET regions')
      const masks = { predicted: {}, expert: {} } as StudyBundle['masks']
      for (const src of ['predicted', 'expert'] as MaskSource[]) {
        const label = src === 'predicted' ? study.predicted : study.expert
        for (const def of REGIONS) masks[src][def.key] = regionMask(label, def.codes)
      }

      await step('Extracting brain surface')
      const brainMesh = buildBrainMesh(study.surface, study.dims, study.affine)
      const brainLattice = buildLatticeMesh(study.surface, study.dims, study.affine, 4)
      if (cancelled) return

      await step('Extracting region isosurfaces')
      const meshes = { predicted: {}, expert: {} } as StudyBundle['meshes']
      const lattices = { predicted: {}, expert: {} } as StudyBundle['lattices']
      for (const src of ['predicted', 'expert'] as MaskSource[]) {
        for (const def of REGIONS) {
          meshes[src][def.key] = buildRegionMesh(masks[src][def.key], study.dims, study.affine)
          lattices[src][def.key] = buildLatticeMesh(masks[src][def.key], study.dims, study.affine, 3)
        }
      }
      if (cancelled) return

      await step('Scoring against expert annotation')
      const brainVoxels = countVoxels(study.brain)
      const crop = maskBounds(study.brain, study.dims, 4) ?? { lo: [0, 0, 0] as Vec3, hi: study.dims }
      const report = buildReport(study.predicted, study.expert, brainVoxels, study.spacing)
      const sha256 = await digest(study)
      if (cancelled) return

      setBundle({
        study, brainMesh, brainLattice, meshes, lattices, masks, report, brainVoxels, crop,
        inverseAffine: invertAffine(study.affine),
        sha256,
        builtAt: new Date().toISOString(),
      })
    })()

    return () => { cancelled = true }
  }, [])

  const value = useMemo(() => bundle, [bundle])
  if (!value) return <>{fallback(stage)}</>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
