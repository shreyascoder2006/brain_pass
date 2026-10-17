import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { GizmoHelper, GizmoViewcube, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { captureRegistry } from '../lib/captureRegistry'
import { meshCentroid } from '../lib/meshing'
import { REGIONS, type RegionKey } from '../lib/regions'
import type { Mesh as IsoMesh } from '../lib/surfaceNets'
import { voxelToWorld } from '../lib/volume'
import { useStore } from '../state/store'
import { useStudy } from '../state/study'
import { useBrainModel } from '../lib/useBrainModel'

function useGeometry(mesh: IsoMesh | null) {
  return useMemo(() => {
    if (!mesh || mesh.indices.length === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3))
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
    g.computeBoundingSphere()
    return g
  }, [mesh])
}

type VisMode = 'surface' | 'overlay' | 'combined'

function RegionSurface({
  mesh, lattice, hex, opacity, visible, wireOnly, order, onSelect,
}: {
  mesh: IsoMesh | null
  lattice: IsoMesh | null
  hex: number
  opacity: number
  visible: boolean
  wireOnly: boolean
  order: number
  onSelect: (e: ThreeEvent<MouseEvent>) => void
}) {
  const geometry = useGeometry(mesh)
  const latticeGeometry = useGeometry(lattice)
  const [hovered, setHovered] = useState(false)
  if (!geometry) return null
  const wireGeometry = latticeGeometry ?? geometry

  return (
    <group
      visible={visible}
      onClick={onSelect}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {!wireOnly && (
        <mesh geometry={geometry} renderOrder={order}>
          <meshPhysicalMaterial
            color={hex}
            transparent
            opacity={opacity}
            roughness={0.32}
            metalness={0.06}
            clearcoat={0.7}
            clearcoatRoughness={0.28}
            side={THREE.DoubleSide}
            depthWrite={false}
            fog={false}
            toneMapped={false}
            emissive={hex}
            emissiveIntensity={hovered ? 0.75 : 0.32}
          />
        </mesh>
      )}
      <mesh geometry={wireGeometry} renderOrder={order + 0.5}>
        <meshBasicMaterial
          color={hex}
          wireframe
          transparent
          fog={false}
          toneMapped={false}
          opacity={wireOnly ? (hovered ? 0.95 : 0.75) : Math.min(0.42, opacity * 0.45 + 0.12)}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Realistic Neural Arborization Network & Synaptic Nerve Endings:
 * Simulates the living cortical pial vascular plexus and dendritic arborizations
 * with glowing micro-synaptic boutons at each nerve terminal.
 */
function NeuralArborization({ visible }: { visible: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  // Generate realistic branching cortical nerve tracts & terminal synaptic points
  const { lineGeometry, pointsGeometry } = useMemo(() => {
    const linePositions: number[] = []
    const pointPositions: number[] = []

    // Seeded pseudo-random generator for consistent neural placement
    let seed = 42
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    // Major cortical arborization clusters over the frontal, parietal, and temporal lobes
    const clusters = [
      { center: [34, 25, 22], count: 28, radius: 46 },   // Right Frontal/Parietal (near tumor)
      { center: [-34, 25, 22], count: 26, radius: 46 },  // Left Frontal/Parietal
      { center: [44, -18, 16], count: 22, radius: 42 },  // Right Temporal/Sylvian
      { center: [-44, -18, 16], count: 22, radius: 42 }, // Left Temporal/Sylvian
      { center: [20, -55, 34], count: 18, radius: 38 },  // Right Parieto-Occipital
      { center: [-20, -55, 34], count: 18, radius: 38 }, // Left Parieto-Occipital
      { center: [12, 45, 12], count: 16, radius: 32 },   // Frontal pole R
      { center: [-12, 45, 12], count: 16, radius: 32 },  // Frontal pole L
    ]

    clusters.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i++) {
        // Start from a sulcal root
        let cx = cluster.center[0] + (rnd() - 0.5) * cluster.radius
        let cy = cluster.center[1] + (rnd() - 0.5) * cluster.radius
        let cz = cluster.center[2] + (rnd() - 0.5) * (cluster.radius * 0.75)

        // Project radially outwards to cortical surface
        const dist = Math.hypot(cx / 72, cy / 90, cz / 68)
        if (dist > 0.1) {
          cx = (cx / dist) * 1.02
          cy = (cy / dist) * 1.02
          cz = (cz / dist) * 1.02
        }

        let currX = cx
        let currY = cy
        let currZ = cz

        // Branch outward in 3-5 segments
        const numSegments = 3 + Math.floor(rnd() * 3)
        for (let s = 0; s < numSegments; s++) {
          const nextX = currX + (rnd() - 0.5) * 8 + (currX > 0 ? 1.5 : -1.5)
          const nextY = currY + (rnd() - 0.5) * 8
          const nextZ = currZ + (rnd() - 0.5) * 6 + 0.8

          // Ensure it stays hugging the cortex
          const nextDist = Math.hypot(nextX / 72, nextY / 90, nextZ / 68)
          const fx = (nextX / (nextDist || 1)) * 1.015
          const fy = (nextY / (nextDist || 1)) * 1.015
          const fz = (nextZ / (nextDist || 1)) * 1.015

          // Line segment
          linePositions.push(currX, currY, currZ, fx, fy, fz)

          // Secondary dendritic split
          if (rnd() > 0.45) {
            const splitX = fx + (rnd() - 0.5) * 6
            const splitY = fy + (rnd() - 0.5) * 6
            const splitZ = fz + (rnd() - 0.5) * 5
            const sDist = Math.hypot(splitX / 72, splitY / 90, splitZ / 68)
            const sx = (splitX / (sDist || 1)) * 1.018
            const sy = (splitY / (sDist || 1)) * 1.018
            const sz = (splitZ / (sDist || 1)) * 1.018
            linePositions.push(fx, fy, fz, sx, sy, sz)
            // Terminal synaptic bouton at split ending
            pointPositions.push(sx, sy, sz)
          }

          currX = fx
          currY = fy
          currZ = fz
        }

        // Terminal nerve ending bouton at branch end
        pointPositions.push(currX, currY, currZ)
      }
    })

    const lGeom = new THREE.BufferGeometry()
    lGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))

    const pGeom = new THREE.BufferGeometry()
    pGeom.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3))

    return { lineGeometry: lGeom, pointsGeometry: pGeom }
  }, [])

  // Animate synaptic nerve pulse transmission
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial
      mat.size = 2.4 + Math.sin(t * 3.5) * 0.6
    }
  })

  if (!visible) return null

  return (
    <group renderOrder={4}>
      {/* Neural axonal fiber branches */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#32d5ff"
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Terminal synaptic boutons / nerve endings */}
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial
          color="#32d5ff"
          size={2.8}
          transparent
          opacity={0.88}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/**
 * Realistic Ivory Cortical Brain Twin:
 * Uses the high-resolution FreeSurfer Colin27 mesh with 589,848 vertices of authentic
 * gyri and sulci folds, shaded with warm-white pale ivory physical material.
 */
function IvoryCorticalBrain({
  fallbackMesh,
  opacity,
  visible,
  visMode,
}: {
  fallbackMesh: IsoMesh | null
  opacity: number
  visible: boolean
  visMode: VisMode
}) {
  const { geometry: freeSurferGeometry, isLoading } = useBrainModel()
  const fallbackGeometry = useGeometry(fallbackMesh)

  const activeGeometry = freeSurferGeometry ?? fallbackGeometry
  if (!activeGeometry) return null

  const isOpaque = visMode === 'surface'
  const effectiveOpacity = isOpaque ? 1.0 : visMode === 'overlay' ? opacity * 0.42 : opacity * 0.72

  return (
    <group visible={visible} raycast={() => null}>
      <mesh geometry={activeGeometry} renderOrder={isOpaque ? 0 : 1}>
        <meshPhysicalMaterial
          color="#ece5d8"
          roughness={0.52}
          metalness={0.02}
          clearcoat={0.24}
          clearcoatRoughness={0.35}
          reflectivity={0.28}
          sheen={0.35}
          sheenColor="#fff2e6"
          side={THREE.DoubleSide}
          transparent={!isOpaque}
          opacity={effectiveOpacity}
          depthWrite={isOpaque}
        />
      </mesh>
    </group>
  )
}

function Crosshair3D({ position, extent }: { position: [number, number, number]; extent: number }) {
  const axes: Array<{ dir: [number, number, number]; colour: string }> = [
    { dir: [1, 0, 0], colour: '#f43f5e' }, // R (red)
    { dir: [0, 1, 0], colour: '#10b981' }, // A (green)
    { dir: [0, 0, 1], colour: '#32d5ff' }, // S (cyan)
  ]
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[2.0, 16, 16]} />
        <meshBasicMaterial color="#32d5ff" />
      </mesh>
      {axes.map(({ dir, colour }, i) => {
        const pts = new Float32Array([
          -dir[0] * extent, -dir[1] * extent, -dir[2] * extent,
          dir[0] * extent, dir[1] * extent, dir[2] * extent,
        ])
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[pts, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={colour} transparent opacity={0.65} depthTest={false} />
          </line>
        )
      })}
    </group>
  )
}

function TumourBeacon({ position, label }: { position: [number, number, number]; label?: string }) {
  const pinLength = 26
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[2.8, 16, 16]} />
        <meshBasicMaterial color="#f43f5e" wireframe />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, 0, pinLength]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#f43f5e" transparent opacity={0.85} />
      </line>
      <mesh position={[0, 0, pinLength]}>
        <sphereGeometry args={[3.2, 14, 14]} />
        <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

interface CameraTarget {
  pos: THREE.Vector3
  look: THREE.Vector3
}

function CameraRig({
  flyTarget,
  presetOrientation,
  spin,
  onInteract,
}: {
  flyTarget: { centre: THREE.Vector3; distance: number } | null
  presetOrientation: 'A' | 'P' | 'L' | 'R' | 'S' | 'I' | null
  spin: boolean
  onInteract: () => void
}) {
  const controls = useRef<any>(null)
  const { camera } = useThree()
  const goal = useRef<CameraTarget | null>(null)

  useEffect(() => {
    if (!presetOrientation || !controls.current) return
    const dist = 350
    const target = controls.current.target.clone()
    let newPos = new THREE.Vector3(0, 0, dist)
    if (presetOrientation === 'A') newPos = new THREE.Vector3(0, dist, 20)
    else if (presetOrientation === 'P') newPos = new THREE.Vector3(0, -dist, 20)
    else if (presetOrientation === 'R') newPos = new THREE.Vector3(dist, 0, 20)
    else if (presetOrientation === 'L') newPos = new THREE.Vector3(-dist, 0, 20)
    else if (presetOrientation === 'S') newPos = new THREE.Vector3(0, 0, dist)
    else if (presetOrientation === 'I') newPos = new THREE.Vector3(0, 0, -dist)

    goal.current = {
      pos: target.clone().add(newPos),
      look: target,
    }
  }, [presetOrientation])

  useEffect(() => {
    if (!flyTarget || !controls.current) return
    const dir = camera.position.clone().sub(controls.current.target).normalize()
    goal.current = {
      pos: flyTarget.centre.clone().add(dir.multiplyScalar(flyTarget.distance)),
      look: flyTarget.centre.clone(),
    }
  }, [flyTarget, camera])

  useFrame(() => {
    const c = controls.current
    if (!c) return
    if (goal.current) {
      camera.position.lerp(goal.current.pos, 0.1)
      c.target.lerp(goal.current.look, 0.1)
      if (camera.position.distanceTo(goal.current.pos) < 0.8) goal.current = null
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      minDistance={40}
      maxDistance={800}
      autoRotate={spin}
      autoRotateSpeed={0.35}
      onStart={onInteract}
      makeDefault
    />
  )
}

function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.65} color="#eef3fa" />
      <hemisphereLight args={['#ffffff', '#060a12', 0.85]} />
      {/* Key warm studio light */}
      <directionalLight position={[190, 240, 310]} intensity={1.65} color="#fffcf5" />
      {/* Fill cool light */}
      <directionalLight position={[-250, -180, 160]} intensity={0.85} color="#9ec5e8" />
      {/* Rim light from behind */}
      <directionalLight position={[0, -240, -220]} intensity={0.7} color="#38bdf8" />
    </>
  )
}

function Scene({
  visMode,
  showNerves,
  presetOrientation,
}: {
  visMode: VisMode
  showNerves: boolean
  presetOrientation: 'A' | 'P' | 'L' | 'R' | 'S' | 'I' | null
}) {
  const { study, brainMesh, meshes, lattices } = useStudy()
  const {
    regions, brainVisible, brainOpacity, isolated, setIsolated,
    wireframe, voxel, maskSource, autoOrbit, setAutoOrbit, hideCrosshair,
  } = useStore()

  const activeMeshes = meshes[maskSource]
  const activeLattices = lattices[maskSource]

  const flyTarget = useMemo(() => {
    const key = isolated
    if (!key) return { centre: new THREE.Vector3(0, 0, 0), distance: 340 }
    const m = activeMeshes[key]
    if (!m) return null
    const c = meshCentroid(m)
    const centre = new THREE.Vector3(c[0], c[1], c[2])
    let r = 0
    const p = m.positions
    for (let i = 0; i < p.length; i += 3) {
      r = Math.max(r, Math.hypot(p[i] - c[0], p[i + 1] - c[1], p[i + 2] - c[2]))
    }
    return { centre, distance: Math.max(70, r * 3.4) }
  }, [isolated, activeMeshes])

  const crosshairWorld = useMemo(
    () => voxelToWorld(study.affine, voxel[0], voxel[1], voxel[2]),
    [study.affine, voxel],
  )

  const order: RegionKey[] = ['WT', 'TC', 'ET']
  const isolatedRank = isolated ? order.indexOf(isolated) : -1

  return (
    <>
      <fog attach="fog" args={['#05070d', 320, 750]} />
      <StudioLighting />

      {/* Realistic Ivory Cortical Brain Twin */}
      <IvoryCorticalBrain
        fallbackMesh={brainMesh}
        opacity={isolated ? brainOpacity * 0.35 : brainOpacity}
        visible={brainVisible}
        visMode={visMode}
      />

      {/* Realistic Neural Arborization Network & Synaptic Nerve Endings */}
      <NeuralArborization visible={showNerves && brainVisible} />

      {/* Segmented Tumor Compartments */}
      {REGIONS.map((def, rank) => {
        const ui = regions[def.key]
        const outerThanIsolated = isolatedRank >= 0 && rank < isolatedRank
        const shouldShow = visMode !== 'surface' && ui.visible
        return (
          <RegionSurface
            key={def.key}
            mesh={activeMeshes[def.key]}
            lattice={activeLattices[def.key]}
            hex={def.hex}
            opacity={ui.opacity}
            visible={shouldShow}
            order={2 + rank * 2}
            wireOnly={wireframe || outerThanIsolated}
            onSelect={(e) => {
              e.stopPropagation()
              setAutoOrbit(false)
              setIsolated(isolated === def.key ? null : def.key)
            }}
          />
        )
      })}

      {!hideCrosshair && (
        <Crosshair3D position={crosshairWorld as [number, number, number]} extent={isolated ? 60 : 150} />
      )}

      {visMode !== 'surface' && study.persona?.tumour && (
        <TumourBeacon
          position={study.persona.tumour.centre as [number, number, number]}
          label={study.persona.lesionType}
        />
      )}

      <CameraRig
        flyTarget={flyTarget}
        presetOrientation={presetOrientation}
        spin={autoOrbit}
        onInteract={() => setAutoOrbit(false)}
      />

      <GizmoHelper alignment="bottom-right" margin={[74, 74]}>
        <GizmoViewcube
          faces={['R', 'L', 'A', 'P', 'S', 'I']}
          color="#0a1020"
          strokeColor="#263854"
          textColor="#f1f6ff"
          hoverColor="#3478ff"
        />
      </GizmoHelper>

      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.25}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={0.45}
        />
        <Vignette offset={0.3} darkness={0.45} eskil={false} />
      </EffectComposer>
    </>
  )
}

function AxisTriad() {
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" className="pointer-events-none">
      <g transform="translate(24,62)">
        {/* R (X) - Red/Coral */}
        <line x1="0" y1="0" x2="36" y2="10" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
        <text x="40" y="14" fill="#f43f5e" fontSize="9.5" fontFamily="monospace" fontWeight="bold">x·R</text>
        {/* A (Y) - Teal/Green */}
        <line x1="0" y1="0" x2="24" y2="-20" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        <text x="27" y="-21" fill="#10b981" fontSize="9.5" fontFamily="monospace" fontWeight="bold">y·A</text>
        {/* S (Z) - Cyan */}
        <line x1="0" y1="0" x2="0" y2="-44" stroke="#32d5ff" strokeWidth="2" strokeLinecap="round" />
        <text x="-4" y="-48" fill="#32d5ff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">z·S</text>
        <circle cx="0" cy="0" r="2.5" fill="#f1f6ff" />
      </g>
    </svg>
  )
}

export default function ThreeBrainTwin() {
  const { report, study } = useStudy()
  const {
    regions, toggleRegion, isolated, setIsolated,
    wireframe, setWireframe, brainVisible, toggleBrain, brainOpacity, setBrainOpacity,
  } = useStore()

  const [visMode, setVisMode] = useState<VisMode>('overlay')
  const [showNerves, setShowNerves] = useState(true)
  const [presetOrientation, setPresetOrientation] = useState<'A' | 'P' | 'L' | 'R' | 'S' | 'I' | null>(null)
  const [showGizmo, setShowGizmo] = useState(true)
  // Both default closed — these floating cards used to sit open over the twin
  // and block the one thing this panel exists to show.
  const [regionsOpen, setRegionsOpen] = useState(false)
  const [visModeOpen, setVisModeOpen] = useState(false)

  const primary: RegionKey = isolated ?? 'WT'
  const primaryDef = REGIONS.find((r) => r.key === primary)!

  const handleOrientationClick = (letter: 'A' | 'P' | 'L' | 'R' | 'S' | 'I') => {
    setPresetOrientation(letter)
    setTimeout(() => setPresetOrientation(null), 300)
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg border border-[#263854]"
      style={{
        background: 'radial-gradient(130% 110% at 50% 40%, #0d1527 0%, #080d19 45%, #05070d 100%)',
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{ position: [30, 180, 330], up: [0, 0, 1], fov: 36, near: 1, far: 4000 }}
        onPointerMissed={() => setIsolated(null)}
        onCreated={(state) => { captureRegistry.threeCanvas = state.gl.domElement }}
      >
        <Scene visMode={visMode} showNerves={showNerves} presetOrientation={presetOrientation} />
      </Canvas>

      {/* Both cards stack in one flex column at a fixed anchor, so expanding
          one can never overlap the other's fixed pixel offset. */}
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">

      {/* Floating Card 1: "Segmentation Regions" — collapsed by default so it
          doesn't sit on top of the twin it's meant to be controlling. */}
      <div className={`rounded-lg border border-[#263854] bg-[#0a1020]/90 backdrop-blur-md shadow-xl shadow-black/40 ${regionsOpen ? 'w-[212px] p-2.5' : 'w-auto'}`}>
        <button
          onClick={() => setRegionsOpen(!regionsOpen)}
          className={`flex w-full items-center justify-between gap-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a4b5ce] hover:text-white ${regionsOpen ? 'mb-2' : 'px-3 py-2'}`}
        >
          <span>Segmentation Regions</span>
          <span className={`text-[9px] transition-transform ${regionsOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {regionsOpen && (
        <div className="space-y-1">
          {REGIONS.map((def) => {
            const ui = regions[def.key]
            return (
              <div
                key={def.key}
                className="flex items-center justify-between rounded px-1.5 py-1 text-[11.5px] hover:bg-white/5 transition"
              >
                <div
                  onClick={() => setIsolated(isolated === def.key ? null : def.key)}
                  className="flex flex-1 items-center gap-2 cursor-pointer"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: def.colour }}
                  />
                  <span className={`truncate ${isolated === def.key ? 'text-[#32d5ff] font-bold' : 'text-[#f1f6ff]'}`}>
                    {def.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#a4b5ce]">
                    {report[def.key].predML.toFixed(1)} mL
                  </span>
                  <button
                    onClick={() => toggleRegion(def.key)}
                    className="text-[#7588a5] hover:text-white"
                    title={ui.visible ? 'Hide region' : 'Show region'}
                  >
                    {ui.visible ? '👁' : '🚫'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Brain surface entry */}
          <div className="flex items-center justify-between rounded px-1.5 py-1 text-[11.5px] hover:bg-white/5 transition border-t border-[#263854]/50 pt-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ede5d8]" />
              <span className="text-[#f1f6ff]">Brain surface</span>
            </div>
            <button
              onClick={toggleBrain}
              className="text-[#7588a5] hover:text-white"
              title={brainVisible ? 'Hide brain surface' : 'Show brain surface'}
            >
              {brainVisible ? '👁' : '🚫'}
            </button>
          </div>

          {/* Neurons & Nerve Endings toggle */}
          <div className="flex items-center justify-between rounded px-1.5 py-1 text-[11.5px] hover:bg-white/5 transition">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#32d5ff] shadow-sm shadow-[#32d5ff]/50 animate-pulse" />
              <span className="text-[#32d5ff] font-medium">Nerve Endings</span>
            </div>
            <button
              onClick={() => setShowNerves(!showNerves)}
              className="text-[#7588a5] hover:text-white"
              title={showNerves ? 'Hide neural nerve network' : 'Show neural nerve network'}
            >
              {showNerves ? '👁' : '🚫'}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Floating Card 2: "Visualization Mode" — collapsed by default, same reason. */}
      <div className={`rounded-lg border border-[#263854] bg-[#0a1020]/90 backdrop-blur-md shadow-xl shadow-black/40 ${visModeOpen ? 'w-[212px] p-2.5' : 'w-auto'}`}>
        <button
          onClick={() => setVisModeOpen(!visModeOpen)}
          className={`flex w-full items-center justify-between gap-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a4b5ce] hover:text-white ${visModeOpen ? 'mb-2' : 'px-3 py-2'}`}
        >
          <span>Visualization Mode</span>
          <span className={`text-[9px] transition-transform ${visModeOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {visModeOpen && (
        <>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-[#101a2b] p-0.5 border border-[#263854]">
          {(['surface', 'overlay', 'combined'] as VisMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setVisMode(mode)}
              className={`rounded py-1 text-[10px] font-semibold capitalize transition ${
                visMode === mode
                  ? 'bg-[#3478ff] text-white shadow-sm'
                  : 'text-[#7588a5] hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold text-[#7588a5]">Opacity</span>
          <span className="font-mono text-[10px] text-[#32d5ff]">
            {brainOpacity.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={brainOpacity}
          onChange={(e) => setBrainOpacity(Number(e.target.value))}
          className="mt-1 w-full"
        />

        <div className="mt-2 flex gap-1.5">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`flex-1 rounded border px-2 py-0.5 text-[10px] font-medium transition ${
              wireframe
                ? 'border-[#32d5ff] bg-[#32d5ff]/15 text-[#32d5ff]'
                : 'border-[#263854] bg-[#101a2b] text-[#a4b5ce] hover:text-white'
            }`}
          >
            Lattice
          </button>
          <button
            onClick={() => {
              setIsolated(null)
              setVisMode('overlay')
            }}
            className="flex-1 rounded border border-[#263854] bg-[#101a2b] px-2 py-0.5 text-[10px] text-[#a4b5ce] hover:text-white"
          >
            Reset
          </button>
        </div>
        </>
        )}
      </div>

      </div>

      {/* Right-edge Vertical Orientation Strip [A, P, L, R, S, I] matching UI Sample 2 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 rounded-full border border-[#263854] bg-[#0a1020]/90 p-1 backdrop-blur-md shadow-lg shadow-black/50 z-10">
        {(['A', 'P', 'L', 'R', 'S', 'I'] as const).map((letter) => (
          <button
            key={letter}
            onClick={() => handleOrientationClick(letter)}
            className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10.5px] font-bold text-[#a4b5ce] transition hover:bg-[#3478ff] hover:text-white"
            title={`Align Camera to ${letter} (${
              letter === 'A' ? 'Anterior' : letter === 'P' ? 'Posterior' : letter === 'L' ? 'Left' : letter === 'R' ? 'Right' : letter === 'S' ? 'Superior' : 'Inferior'
            })`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Bottom Center Hint Text matching UI Sample 2 */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-sans text-[10.5px] text-[#7588a5]">
        Drag to orbit · Scroll to zoom · Right click to pan
      </div>

      {/* Bottom Left 3D Triad */}
      <div className="pointer-events-none absolute bottom-2 left-2">
        <AxisTriad />
      </div>

      {/* Bottom Right Floating Action Bar (Cube, Reset, Fullscreen) matching UI Sample 2 */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-[#263854] bg-[#0a1020]/90 p-1 backdrop-blur-md shadow-lg shadow-black/50 z-10">
        <button
          onClick={() => setShowGizmo(!showGizmo)}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
          title="Toggle Orientation Cube"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
        </button>
        <button
          onClick={() => {
            useStore.getState().setIsolated(null)
            handleOrientationClick('S')
          }}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
          title="Reset Camera View"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8M3 3v5h5" />
          </svg>
        </button>
        <button
          onClick={() => {
            const el = document.documentElement
            if (!document.fullscreenElement) el.requestFullscreen?.()
            else document.exitFullscreen?.()
          }}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-white"
          title="Toggle Fullscreen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>

      {/* Isolated Region Banner */}
      {isolated && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-[#32d5ff]/50 bg-[#0a1020]/95 px-4 py-1 text-[11px] font-semibold text-[#32d5ff] backdrop-blur-md shadow-lg shadow-black/50">
          Isolated Compartment: {primaryDef.label} — click empty space to return
        </div>
      )}
    </div>
  )
}
