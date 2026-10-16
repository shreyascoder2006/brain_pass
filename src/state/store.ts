import { create } from 'zustand'
import type { RegionKey } from '../lib/regions'
import type { SequenceName, Vec3 } from '../lib/volume'

export type PlaneKey = 'axial' | 'coronal' | 'sagittal'
export type MaskSource = 'predicted' | 'expert'

interface RegionUi {
  visible: boolean
  opacity: number
}

interface State {
  sequence: SequenceName
  setSequence: (s: SequenceName) => void

  /** crosshair in voxel indices (i, j, k) */
  voxel: Vec3
  setVoxel: (v: Vec3) => void

  activePanel: PlaneKey | null
  setActivePanel: (p: PlaneKey | null) => void

  regions: Record<RegionKey, RegionUi>
  toggleRegion: (k: RegionKey) => void
  setOpacity: (k: RegionKey, o: number) => void

  brainVisible: boolean
  toggleBrain: () => void
  brainOpacity: number
  setBrainOpacity: (o: number) => void

  /** region the camera has flown to; outer shells drop to wireframe */
  isolated: RegionKey | null
  setIsolated: (k: RegionKey | null) => void

  wireframe: boolean
  setWireframe: (w: boolean) => void

  /** slow idle rotation, stopped the moment the user touches the scene */
  autoOrbit: boolean
  setAutoOrbit: (a: boolean) => void

  maskSource: MaskSource
  setMaskSource: (m: MaskSource) => void

  showOverlay: boolean
  toggleOverlay: () => void

  uploadOpen: boolean
  setUploadOpen: (open: boolean) => void
}

export const useStore = create<State>((set) => ({
  sequence: 'T1Gd',
  setSequence: (sequence) => set({ sequence }),

  voxel: [80, 96, 80],
  setVoxel: (voxel) => set({ voxel }),

  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),

  regions: {
    WT: { visible: true, opacity: 0.28 },
    TC: { visible: true, opacity: 0.55 },
    ET: { visible: true, opacity: 0.72 },
  },
  toggleRegion: (k) =>
    set((s) => ({ regions: { ...s.regions, [k]: { ...s.regions[k], visible: !s.regions[k].visible } } })),
  setOpacity: (k, opacity) =>
    set((s) => ({ regions: { ...s.regions, [k]: { ...s.regions[k], opacity } } })),

  brainVisible: true,
  toggleBrain: () => set((s) => ({ brainVisible: !s.brainVisible })),
  brainOpacity: 0.2,
  setBrainOpacity: (brainOpacity) => set({ brainOpacity }),

  isolated: null,
  setIsolated: (isolated) => set({ isolated }),

  wireframe: false,
  setWireframe: (wireframe) => set({ wireframe }),

  autoOrbit: true,
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),

  maskSource: 'predicted',
  setMaskSource: (maskSource) => set({ maskSource }),

  showOverlay: true,
  toggleOverlay: () => set((s) => ({ showOverlay: !s.showOverlay })),

  uploadOpen: false,
  setUploadOpen: (uploadOpen) => set({ uploadOpen }),
}))
