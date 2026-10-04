import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(1)
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202428)
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 50)
// Blender (x, y, z) -> glTF (x, z, -y); same camera as bake.py's debug camera
camera.position.set(2.0, 1.7, 2.6)
camera.lookAt(0, 0.6, 0)

// "live" mode lights: rough hand-made equivalent of the lights in bake.py
const live = new THREE.Group()
live.add(new THREE.HemisphereLight(0xb0bcd0, 0x806040, 0.8))
const sun = new THREE.DirectionalLight(0xffeacc, 2.2)
sun.position.set(1.5, 1.8, 0.2)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 })
sun.shadow.camera.updateProjectionMatrix() // the ortho bounds are only applied on update
sun.shadow.bias = -0.0005 // without bias the walls and floor show shadow acne (moire)
sun.shadow.normalBias = 0.02
live.add(sun)
scene.add(live)
renderer.shadowMap.enabled = true

// ?view=idle|desk|monitor shows the v2 scene (scene_v2.py) from the app's camera keyframes
// (app/src/Camera.ts, app units / 900 = glTF units, fov 35 as in Renderers.ts). Without it the
// page shows the W2-C learning bake as before.
const VIEWS = {
  idle: [[-20000, 12000, 20000], [0, -1000, 0]],
  desk: [[0, 1800, 5500], [0, 500, 0]],
  monitor: [[0, 950, 2000], [0, 950, 0]],
}
const params = new URLSearchParams(location.search)
const view = VIEWS[params.get('view')]
const models = view
  // the v2 GLBs carry the lightmap as their only UV set, as the app's BakedModel expects
  ? ['computer', 'environment', 'decor'].map((g) => [`/v2/${g}.glb`, `/v2/${g}.jpg`, 0])
  : [['/scene.glb', '/lightmap.jpg', 1]] // second UV set (TEXCOORD_1 / "Lightmap")
if (view) {
  const [eye, target] = view.map((p) => p.map((c) => c / 900))
  Object.assign(camera, { fov: 35, near: 0.01, far: 1000 })
  camera.position.set(...eye)
  camera.lookAt(...target)
  camera.updateProjectionMatrix()
}

const meshes = []
for (const [glb, jpg, channel] of models) {
  const lightmap = await new THREE.TextureLoader().loadAsync(jpg)
  lightmap.flipY = false // glTF UV origin is top-left
  lightmap.colorSpace = THREE.SRGBColorSpace // the JPG is already display-referred
  lightmap.channel = channel
  const gltf = await new GLTFLoader().loadAsync(glb)
  scene.add(gltf.scene)
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = o.receiveShadow = true
    o.userData.liveMat = o.material
    o.userData.bakedMat = new THREE.MeshBasicMaterial({ map: lightmap })
    meshes.push(o)
  })
}
let baked = params.get('mode') === 'baked'
function apply() {
  live.visible = !baked
  for (const o of meshes) o.material = baked ? o.userData.bakedMat : o.userData.liveMat
  document.getElementById('label').textContent = baked ? 'baked lightmap (MeshBasicMaterial)' : 'live lighting'
  renderer.render(scene, camera)
}
document.getElementById('toggle').onclick = () => { baked = !baked; apply() }
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  apply()
})
apply()
