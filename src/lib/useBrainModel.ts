import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

let cachedGeometry: THREE.BufferGeometry | null = null
let loadingPromise: Promise<THREE.BufferGeometry> | null = null

export function loadFreeSurferBrain(): Promise<THREE.BufferGeometry> {
  if (cachedGeometry) return Promise.resolve(cachedGeometry)
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const loader = new OBJLoader()
    loader.load(
      '/models/freesurff.Obj',
      (obj) => {
        try {
          const box = new THREE.Box3().setFromObject(obj)
          const center = new THREE.Vector3()
          box.getCenter(center)

          // Target scale: 34.2 scales the ~4.32x4.05x5.39 unit FreeSurfer mesh
          // to exactly ~148x138x184 mm, matching standard human brain anatomy
          const scale = 34.2
          const transformMatrix = new THREE.Matrix4()
            .makeScale(scale, scale, scale)
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
            .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
            .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z))

          const geometries: THREE.BufferGeometry[] = []
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh
              const g = mesh.geometry.clone()
              g.applyMatrix4(transformMatrix)
              g.computeVertexNormals()
              geometries.push(g)
            }
          })

          const merged = geometries.length > 1 ? mergeGeometries(geometries) : geometries[0]
          merged.computeBoundingSphere()
          cachedGeometry = merged
          resolve(merged)
        } catch (err) {
          reject(err)
        }
      },
      undefined,
      (err) => reject(err),
    )
  })

  return loadingPromise
}

export function useBrainModel() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(cachedGeometry)
  const [isLoading, setIsLoading] = useState(!cachedGeometry)

  useEffect(() => {
    if (cachedGeometry) {
      setGeometry(cachedGeometry)
      setIsLoading(false)
      return
    }

    let isMounted = true
    loadFreeSurferBrain()
      .then((geom) => {
        if (isMounted) {
          setGeometry(geom)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.warn('Could not load FreeSurfer brain model, using procedural fallback:', err)
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { geometry, isLoading }
}
