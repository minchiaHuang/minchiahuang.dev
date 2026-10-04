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
  idle: [[-17500, 10500, 18500], [0, -600, 0]],
  desk: [[0, 1700, 5200], [0, 550, 0]],
  monitor: [[0, 950, 2125], [0, 950, 255]],
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
// The translucent shell is not baked (blender/scene_v2.py): it keeps its glTF material, so it
// needs real lights. They touch nothing else, since the baked meshes are unlit.
scene.add(new THREE.HemisphereLight(0xdde6ff, 0x202428, 1.5))
const key = new THREE.DirectionalLight(0xffe2c0, 2)
key.position.set(0, 3, 0.5)
scene.add(key)
const shell = await new GLTFLoader().loadAsync('/v2/shell.glb')
scene.add(shell.scene)

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
