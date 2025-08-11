/* ================== index.js ================== */
import * as THREE from 'three';
import { PointerLockControls } from 'jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';

// --- Renderer setup ---
// Creates the WebGL renderer, configures resolution and color space, and appends it to the document.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Scene and camera setup ---
// Initializes the scene and sets a dark background color.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0f12);

// Creates a perspective camera for a 3D view.
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
scene.add(camera);

// --- Lighting ---
// Hemisphere light for ambient lighting from above and below.
const hemi = new THREE.HemisphereLight(0xffffff, 0x303030, 1.1);
hemi.position.set(0, 20, 0);
scene.add(hemi);

// Directional light to simulate sunlight.
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 8, 5);
scene.add(dir);

// --- Pointer lock controls (Minecraft creative style) ---
// Enables free-fly movement with WASD, Space, Ctrl, and Shift.
const controls = new PointerLockControls(camera, document.body);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
let moveF = false, moveB = false, moveL = false, moveR = false, moveUp = false, moveDown = false, sprint = false;

// Click anywhere to lock pointer and enable camera look.
window.addEventListener('click', () => {
  controls.lock();
});

// --- Keyboard input handling ---
// Maps key presses to movement directions.
const onKeyDown = (event) => {
  switch (event.code) {
    case 'KeyW': moveF = true; break;
    case 'KeyS': moveB = true; break;
    case 'KeyA': moveL = true; break;
    case 'KeyD': moveR = true; break;
    case 'Space': moveUp = true; break;
    case 'ShiftLeft': sprint = true; break;
    case 'ControlLeft': moveDown = true; break;
  }
};
const onKeyUp = (event) => {
  switch (event.code) {
    case 'KeyW': moveF = false; break;
    case 'KeyS': moveB = false; break;
    case 'KeyA': moveL = false; break;
    case 'KeyD': moveR = false; break;
    case 'Space': moveUp = false; break;
    case 'ShiftLeft': sprint = false; break;
    case 'ControlLeft': moveDown = false; break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Adds the controls object to the scene (this represents the camera rig).
scene.add(controls.getObject());

// --- Model loading ---
// Loads a GLTF/GLB 3D model and centers it in the scene.
const loader = new GLTFLoader();
const MODEL_URL = './assets/model.glb';

loader.load(
  MODEL_URL,
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Calculate the bounding box to center the model.
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Position the camera rig at the model's center.
    camera.position.copy(center);
    controls.getObject().position.copy(center);
  },
  undefined,
  (err) => {
    console.error('Error loading GLTF model:', err);
  }
);

// --- Window resize handling ---
// Keeps camera aspect ratio and renderer size in sync with the browser window.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
// Updates movement, applies velocity, and renders the scene every frame.
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const baseSpeed = 50.0; // Normal fly speed (10x relative to original)
  const speed = sprint ? baseSpeed * 10 : baseSpeed; // Sprint speed (100x relative to original)

  // Apply friction to velocity for smooth stop.
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.y -= velocity.y * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  // Calculate forward/backward and strafe movement vectors based on camera orientation.
  frontVector.set(0, 0, Number(moveB) - Number(moveF)).applyQuaternion(camera.quaternion);
  sideVector.set(Number(moveR) - Number(moveL), 0, 0).applyQuaternion(camera.quaternion);

  // Combine direction vectors, ignore vertical tilt for horizontal movement.
  direction.copy(frontVector).add(sideVector);
  direction.y = 0;
  direction.normalize();

  // Apply movement input to velocity.
  if (moveF || moveB || moveL || moveR) {
    velocity.add(direction.multiplyScalar(speed * delta));
  }

  // Apply vertical movement (fly up/down).
  if (moveUp) velocity.y += speed * delta;
  if (moveDown) velocity.y -= speed * delta;

  // Move the camera rig by the calculated velocity.
  controls.getObject().position.add(velocity.clone().multiplyScalar(delta));

  // Render the scene from the camera's point of view.
  renderer.render(scene, camera);
})();
