# Three.js Model Viewer with Creative Mode Controls

This project is a simple **3D model viewer** built with [Three.js](https://threejs.org/) and hosted on **GitHub Pages**. It supports **Minecraft creative mode-style controls**, allowing free-fly movement around a 3D scene with WASD, Space, Ctrl, and Shift.

## Features
- Loads and displays `.glb` or `.gltf` 3D models.
- Free-fly camera controls with:
  - **WASD** for horizontal movement.
  - **Space** to move up.
  - **Ctrl (Left)** to move down.
  - **Shift (Left)** to sprint.
- Sprint speed is 100× the original base speed, normal speed is 10×.
- Pointer lock for mouse look (click to activate).
- Ambient and directional lighting.
- Automatic resizing to fit browser window.

## Controls
| Key | Action |
|-----|--------|
| W   | Move forward |
| S   | Move backward |
| A   | Strafe left |
| D   | Strafe right |
| Space | Move up |
| Ctrl (Left) | Move down |
| Shift (Left) | Sprint (100× base speed) |
| Mouse | Look around (after clicking to lock pointer) |

## Dependencies
- [Three.js](https://threejs.org/) via CDN
- `PointerLockControls` for free-look movement
- `GLTFLoader` for loading `.glb`/`.gltf` models

## License
This project is open-source under the MIT License.