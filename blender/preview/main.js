import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(1)
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202428)
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 50)

// Must match the keyframes in app/src/Camera.ts (app units / 900 = glTF units, fov 35).
const VIEWS = {
  idle: [[-20000, 12000, 20000], [0, -1000, 0]],
  desk: [[0, 1800, 5500], [0, 500, 0]],
  monitor: [[0, 950, 2000], [0, 950, 0]],
}
const params = new URLSearchParams(location.search)
const view = VIEWS[params.get('view')] ?? VIEWS.idle
// the v2 GLBs carry the lightmap as their only UV set, as the app's BakedModel expects
const models = ['computer', 'environment', 'decor'].map((g) => [`/v2/${g}.glb`, `/v2/${g}.jpg`, 0])
const [eye, target] = view.map((p) => p.map((c) => c / 900))
Object.assign(camera, { fov: 35, near: 0.01, far: 1000 })
camera.position.set(...eye)
camera.lookAt(...target)
camera.updateProjectionMatrix()

for (const [glb, jpg, channel] of models) {
  const lightmap = await new THREE.TextureLoader().loadAsync(jpg)
  lightmap.flipY = false // glTF UV origin is top-left
  lightmap.colorSpace = THREE.SRGBColorSpace // the JPG is already display-referred
  lightmap.channel = channel
  const gltf = await new GLTFLoader().loadAsync(glb)
  scene.add(gltf.scene)
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return
    o.material = new THREE.MeshBasicMaterial({ map: lightmap })
  })
}
function apply() {
  renderer.render(scene, camera)
}
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  apply()
})
apply()
