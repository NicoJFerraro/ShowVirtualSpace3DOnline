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

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 10000);

// ===== Luces (realista + cool) =====
const sun = new THREE.DirectionalLight(0xfff2cc, 1.2);
sun.position.set(50, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 1000;
const S = 200;
sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
sun.shadow.camera.top = S;   sun.shadow.camera.bottom = -S;
scene.add(sun);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const fillLight = new THREE.DirectionalLight(0x88ccff, 0.6);
fillLight.position.set(-50, 40, -30);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
backLight.position.set(0, 50, -100);
scene.add(backLight);

// HDRI (iluminación global y reflejos)
new RGBELoader()
  .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
  .load('studio_small_09_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
    // scene.background = hdr; // dejalo comentado si querés fondo sólido
  });

// ===== Controles desktop + mobile =====
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();

let moveF=false, moveB=false, moveL=false, moveR=false, moveUp=false, moveDown=false, sprint=false;

// Desktop: pointer lock
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (!isMobile) {
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
}

// ===== Mobile: joystick (move) + thumb-look (giro) =====
let lookDelta = new THREE.Vector2(0,0);
let moveAxis = new THREE.Vector2(0,0); // x: derecha(+)/izq(-)  | y: adelante(+)/atrás(-)
let yaw = 0, pitch = 0;

if (isMobile) {
  document.documentElement.style.touchAction = 'none'; // evita scroll

  // HUD minimal
  const hud = document.createElement('div');
  hud.innerHTML = `
    <style>
      .joy {position:fixed; bottom:22px; left:22px; width:120px; height:120px; border-radius:999px; background:#ffffff14; backdrop-filter: blur(2px);}
      .knob{position:absolute; left:50%; top:50%; width:56px; height:56px; margin:-28px 0 0 -28px; border-radius:999px; background:#ffffff33;}
      .look {position:fixed; right:22px; bottom:22px; width:44vw; height:44vw; max-width:240px; max-height:240px; border-radius:16px; background:#ffffff10;}
      .btn  {position:fixed; right:22px; bottom: calc(22px + 48vw); transform: translateY(0); padding:10px 14px; border-radius:12px; background:#ffffff1a; color:#fff; font:14px/1.2 system-ui; border:1px solid #ffffff2a;}
    </style>
    <div id="joy" class="joy"><div id="knob" class="knob"></div></div>
    <div id="look" class="look"></div>
    <button id="sprintBtn" class="btn">Sprint</button>
  `;
  document.body.appendChild(hud);

  const joy = document.getElementById('joy');
  const knob = document.getElementById('knob');
  const look = document.getElementById('look');
  const sprintBtn = document.getElementById('sprintBtn');

  // Joystick movimiento
  const joyRect = () => joy.getBoundingClientRect();
  let joyActive = false;
  joy.addEventListener('touchstart', (e) => { joyActive = true; e.preventDefault(); }, {passive:false});
  joy.addEventListener('touchend',   (e) => { joyActive = false; moveAxis.set(0,0); knob.style.left='50%'; knob.style.top='50%'; }, {passive:false});
  joy.addEventListener('touchmove',  (e) => {
    if (!joyActive) return;
    const t = e.touches[0];
    const r = joyRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const maxR = r.width/2 - 10;
    const len = Math.min(Math.hypot(dx,dy), maxR);
    const ang = Math.atan2(dy, dx);
    const nx = Math.cos(ang) * (len/maxR);
    const ny = Math.sin(ang) * (len/maxR);
    // nx: derecha + / ny: abajo +  → convertimos a nuestro sistema (y adelante +):
    moveAxis.set(nx, -ny);
    knob.style.left = (50 + nx*40) + '%';
    knob.style.top  = (50 + ny*40) + '%';
    e.preventDefault();
  }, {passive:false});

  // Área de “mira” (giro)
  let lookActive = false, lastX=0, lastY=0;
  look.addEventListener('touchstart', (e) => {
    lookActive = true;
    const t = e.touches[0];
    lastX = t.clientX; lastY = t.clientY;
    e.preventDefault();
  }, {passive:false});
  look.addEventListener('touchend', (e) => { lookActive = false; }, {passive:false});
  look.addEventListener('touchmove', (e) => {
    if (!lookActive) return;
    const t = e.touches[0];
    const dx = t.clientX - lastX;
    const dy = t.clientY - lastY;
    lastX = t.clientX; lastY = t.clientY;
    lookDelta.x += dx;
    lookDelta.y += dy;
    e.preventDefault();
  }, {passive:false});

  // Sprint mientras se mantenga apretado
  sprintBtn.addEventListener('touchstart', () => { sprint = true; }, {passive:true});
  sprintBtn.addEventListener('touchend',   () => { sprint = false; }, {passive:true});

  // Inicializar yaw/pitch desde la cámara
  yaw = controls.getObject().rotation.y;
  pitch = camera.rotation.x;
}

// ===== Helper encuadre =====
function frameModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const diag = size.length() || 1;
  camera.near = Math.max(0.001, diag / 5000);
  camera.far  = Math.max(1000,  diag * 10);
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
    const tmpBox = new THREE.Box3().setFromObject(model);
    const diag = tmpBox.getSize(new THREE.Vector3()).length() || 1;
    if (diag > 10000) model.scale.setScalar(1/1000);
    if (diag < 0.001) model.scale.setScalar(1000);

    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          o.material.envMapIntensity = 1.0;
          if (o.material.transparent && o.material.opacity === 0) o.material.opacity = 1;
          o.material.side = THREE.DoubleSide;
        }
      }
    });

    scene.add(model);
    frameModel(model);
  },
  undefined,
  (err) => console.error('Error loading GLTF model:', err)
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

  // amortiguación
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.y -= velocity.y * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  // ==== Dirección (desktop) ====
  let moved = false;
  if (!isMobile) {
    frontVector.set(0, 0, Number(moveB) - Number(moveF)).applyQuaternion(camera.quaternion);
    sideVector.set(Number(moveR) - Number(moveL), 0, 0).applyQuaternion(camera.quaternion);
    direction.copy(frontVector).add(sideVector);
    direction.y = 0;
    if (direction.lengthSq() > 0) {
      direction.normalize();
      velocity.add(direction.multiplyScalar(speed * delta));
      moved = true;
    }
    if (moveUp)   { velocity.y += speed * delta; moved = true; }
    if (moveDown) { velocity.y -= speed * delta; moved = true; }
  }

  // ==== Dirección (mobile joystick) ====
  if (isMobile) {
    if (moveAxis.lengthSq() > 1e-4) {
      // forward = hacia donde mira la cámara, en XZ
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();

      // moveAxis.y adelante(+) / atrás(-), moveAxis.x derecha(+)/izq(-)
      direction.copy(forward).multiplyScalar(moveAxis.y).add(right.multiplyScalar(moveAxis.x));
      if (direction.lengthSq() > 0) {
        direction.normalize();
        velocity.add(direction.multiplyScalar(speed * delta));
        moved = true;
      }
    }

    // aplicar mirada desde thumb-look
    const lookSensitivity = 0.0025; // ajustá sensibilidad
    yaw   -= lookDelta.x * lookSensitivity;
    pitch -= lookDelta.y * lookSensitivity;
    const maxPitch = Math.PI/2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
    // aplicar rotaciones
    controls.getObject().rotation.y = yaw;
    camera.rotation.x = pitch;
    lookDelta.set(0,0);
  }

  if (moved) controls.getObject().position.addScaledVector(velocity, delta);

  renderer.render(scene, camera);
})();
