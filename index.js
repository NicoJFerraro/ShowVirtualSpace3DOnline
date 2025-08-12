/* ================== index.js ================== */
import * as THREE from 'three';
import { PointerLockControls } from 'jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'jsm/loaders/RGBELoader.js';

// ===== Render =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ===== Escena y cámara =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f12);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.001,
  10000
);

// ===== Luces =====
// Sol cálido
const sun = new THREE.DirectionalLight(0xfff2cc, 1.2);
sun.position.set(50, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 1000;
const S = 200;
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
scene.add(sun);

// Luz ambiental suave
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Luz de relleno fría
const fillLight = new THREE.DirectionalLight(0x88ccff, 0.6);
fillLight.position.set(-50, 40, -30);
scene.add(fillLight);

// Luz de fondo para recortar silueta
const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
backLight.position.set(0, 50, -100);
scene.add(backLight);

// ===== HDRI para iluminación global y reflejos =====
new RGBELoader()
  .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
  .load('studio_small_09_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr; // luz global
    scene.background = hdr;  // si querés el fondo realista
  });

// ===== Controles estilo Minecraft creativo =====
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
let moveF = false, moveB = false, moveL = false, moveR = false, moveUp = false, moveDown = false, sprint = false;

window.addEventListener('click', () => controls.lock());
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': moveF = true; break;
    case 'KeyS': moveB = true; break;
    case 'KeyA': moveL = true; break;
    case 'KeyD': moveR = true; break;
    case 'Space': moveUp = true; break;
    case 'ShiftLeft': sprint = true; break;
    case 'ControlLeft': moveDown = true; break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': moveF = false; break;
    case 'KeyS': moveB = false; break;
    case 'KeyA': moveL = false; break;
    case 'KeyD': moveR = false; break;
    case 'Space': moveUp = false; break;
    case 'ShiftLeft': sprint = false; break;
    case 'ControlLeft': moveDown = false; break;
  }
});

// ===== Helper para encuadrar el modelo =====
function frameModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const diag = size.length() || 1;
  camera.near = Math.max(0.001, diag / 5000);
  camera.far = Math.max(1000, diag * 10);
  camera.updateProjectionMatrix();

  const dist = Math.max(size.x, size.y, size.z) * 1.5;
  const dir = new THREE.Vector3(1, 0.6, 1).normalize();
  const camPos = dir.multiplyScalar(dist);

  controls.getObject().position.copy(camPos);
}

// ===== Carga del modelo =====
const loader = new GLTFLoader();
const MODEL_URL = './assets/model.glb';

loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;

    // Normalizar escala
    const tmpBox = new THREE.Box3().setFromObject(model);
    const diag = tmpBox.getSize(new THREE.Vector3()).length() || 1;
    if (diag > 10000) model.scale.setScalar(1 / 1000);
    if (diag < 0.001) model.scale.setScalar(1000);

    // Sombra + materiales listos para reflejos
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          const m = o.material;
          m.envMapIntensity = 1.0; // reflejos del HDRI
          if (m.transparent && m.opacity === 0) m.opacity = 1;
          m.side = THREE.DoubleSide;
        }
      }
    });

    scene.add(model);
    frameModel(model);
  },
  undefined,
  (err) => console.error('Error GLTF:', err)
);

// ===== Resize =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ===== Loop =====
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.033, clock.getDelta());
  const baseSpeed = 1.0;
  const speed = sprint ? baseSpeed * 10 : baseSpeed;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.y -= velocity.y * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  frontVector.set(0, 0, Number(moveB) - Number(moveF)).applyQuaternion(camera.quaternion);
  sideVector.set(Number(moveR) - Number(moveL), 0, 0).applyQuaternion(camera.quaternion);

  direction.copy(frontVector).add(sideVector);
  direction.y = 0;
  if (direction.lengthSq() > 0) direction.normalize();

  if (moveF || moveB || moveL || moveR) velocity.add(direction.multiplyScalar(speed * delta));
  if (moveUp) velocity.y += speed * delta;
  if (moveDown) velocity.y -= speed * delta;

  controls.getObject().position.addScaledVector(velocity, delta);

  renderer.render(scene, camera);
})();
