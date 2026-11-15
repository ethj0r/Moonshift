import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AmbientLight, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping, Group } from "three";
const q = new URLSearchParams(location.search);
const W = Number(q.get("w") ?? 512), H = Number(q.get("h") ?? 512);
const r = new WebGLRenderer({ canvas: document.getElementById("c") as HTMLCanvasElement, alpha: true, antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H);
r.outputColorSpace = SRGBColorSpace;
r.toneMapping = ACESFilmicToneMapping;
r.toneMappingExposure = 1.05;
const scene = new Scene();
scene.add(new HemisphereLight("#fff6e8", "#8a7a66", 1.4));
scene.add(new AmbientLight("#ffffff", 0.35));
const key = new DirectionalLight("#fff1dc", 2.6); key.position.set(3, 5, 6); scene.add(key);
const rim = new DirectionalLight("#9fc4ff", 1.2); rim.position.set(-4, 3, -3); scene.add(rim);
const g = await new GLTFLoader().loadAsync(`/assets/models/${q.get("id")}.glb`);
const root = new Group(); root.add(g.scene); scene.add(root);

const { makeFace } = await import("../../src/scene/face");
if (q.get("face")) g.scene.add(makeFace(q.get("face") as any));
if (q.get("frame")) { const [x, y, z] = q.get("frame")!.split(",").map(Number); (window as any).__frame = [x, y, z]; }
root.rotation.y = Number(q.get("ry") ?? 0);

const { Box3, Vector3, Sphere } = await import("three");
const sph = new Box3().setFromObject(root).getBoundingSphere(new Sphere());
const fov = Number(q.get("fov") ?? 26);
const cam = new PerspectiveCamera(fov, W / H, 0.1, 200);
const el = Number(q.get("el") ?? 0.35);
const d = (sph.radius * Number(q.get("pad") ?? 1.12)) / Math.sin((fov * Math.PI) / 360);
cam.position.set(sph.center.x, sph.center.y + Math.sin(el) * d, sph.center.z + Math.cos(el) * d);
cam.lookAt(sph.center.x, sph.center.y, sph.center.z);
if (q.get("close")) { cam.position.set(0, 1.62, 2.4); cam.lookAt(0, 1.58, 0); cam.fov = 22; cam.updateProjectionMatrix(); }
r.render(scene, cam);
(window as any).__done = true;
