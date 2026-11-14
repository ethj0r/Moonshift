import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import manifest from "../../asset-manifest.json";
import { EARTH, ease, RESCUE_AT, shotProgress, SUN, type Cine } from "../game/cutscenes";
import {
  CARGO,
  ending,
  researchReady,
  SHELTER_CELL,
  VENTS,
  wallName,
  type Phase,
  type Plan,
  type State,
  type WallId,
} from "../game/rules";
import {
  BEEP_START,
  BERM,
  cellPos,
  CREW_HOME,
  PICKUP_SPOTS,
  RESCUE_PAD,
  SOLAR_TOWERS,
  FACILITY,
  ISLAND,
  itemCell,
  OBSTACLES,
  PIPE,
  PIPE_ENDS,
  SHELTER,
  YARD,
  type Gesture,
  type Interactable,
  type Vec2,
} from "../game/world";

type ModelId = (typeof manifest.models)[number]["id"];
type P3 = [number, number, number];
export interface SceneProps {
  mode: "menu" | "play";
  state: State;
  plan: Plan;
  phase: Phase;
  interactables: Interactable[];
  carrying: WallId | null;
  walk: { at: Vec2; id: string | null; nonce: number } | null;
  controlsLocked: boolean;
  gesture: Gesture | null;
  pipeAngle: number;
  goggles: boolean;
  scanning: boolean;
  intro: boolean;
  cine: Cine | null;
  /** Camera orbit around B.E.E.P. (radians); WASD follows the view. */
  yaw: number;
  /** Interactable ids the live route points at (nearest wins). */
  guide: string[];
  /** A real choice: mark every option the same, draw no route to one of them. */
  guideChoice: boolean;
  paused: boolean;
  lowGraphics: boolean;
  reducedMotion: boolean;
  zoom: number;
  onFocus: (id: string | null) => void;
  onArrive: (id: string | null) => void;
  onPick: (id: string) => void;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onError: () => void;
}

// Dev hot reload re-runs this module: keep the loaded models, or every edit crashes the 3D view.
const models: Map<string, Group> = import.meta.hot ? (import.meta.hot.data.models ??= new Map()) : new Map();
const sharedMaterials: Map<string, Material> = import.meta.hot ? (import.meta.hot.data.materials ??= new Map()) : new Map();
let pending: Promise<void> | null = null;
let consumers = 0;
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
const BASE = import.meta.env.BASE_URL;
const FOCUS_RADIUS = 1.25;
const SPEED = 4.2; // the outpost is wider now (landing pad far from the habitat)

async function loadAssets(onProgress: (value: number) => void) {
  if (models.size === manifest.models.length) {
    onProgress(1);
    return;
  }
  if (pending) return pending;
  const loader = new GLTFLoader();
  pending = (async () => {
    let cursor = 0;
    const worker = async () => {
      while (cursor < manifest.models.length) {
        const model = manifest.models[cursor++];
        if (!models.has(model.id)) {
          const response = await fetch(`${BASE}${model.url}`, {
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error(`Could not load ${model.id}`);
          const gltf = await loader.parseAsync(await response.arrayBuffer(), BASE);
          gltf.scene.traverse((object) => {
            if (!(object instanceof Mesh)) return;
            const pool = (material: Material) => {
              const key = material.name;
              if (sharedMaterials.has(key)) {
                const pooled = sharedMaterials.get(key)!;
                if (pooled !== material) material.dispose();
                return pooled;
              }
              if (material instanceof MeshStandardMaterial && material.transparent)
                material.depthWrite = false;
              sharedMaterials.set(key, material);
              return material;
            };
            object.material = Array.isArray(object.material)
              ? object.material.map(pool)
              : pool(object.material);
          });
          models.set(model.id, gltf.scene);
        }
        onProgress(models.size / manifest.models.length);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  })().finally(() => {
    pending = null;
  });
  return pending;
}

function disposeCache() {
  const geometry = new Set<BufferGeometry>();
  for (const group of models.values())
    group.traverse((object) => {
      if (object instanceof Mesh) geometry.add(object.geometry);
    });
  for (const value of geometry) value.dispose();
  for (const value of sharedMaterials.values()) value.dispose();
  models.clear();
  sharedMaterials.clear();
}

function Model({
  id,
  position = [0, 0, 0],
  scale = 1,
  rotation = 0,
  onClick,
}: {
  id: ModelId;
  position?: P3;
  scale?: number;
  rotation?: number;
  onClick?: () => void;
}) {
  const object = useMemo(() => models.get(id)!.clone(true), [id]);
  return (
    <primitive
      object={object}
      position={position}
      scale={scale}
      rotation-y={rotation}
      dispose={null}
      onClick={
        onClick
          ? (event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              onClick();
            }
          : undefined
      }
    />
  );
}

const at3 = ([x, z]: Vec2, y = 0): P3 => [x, y, z];

/** A flat lunar plain to the horizon (no floating island), with craters, rocks and the outpost's infrastructure. */
function Island({ onGround }: { onGround: (point: Vec3Like) => void }) {
  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onGround(event.point);
        }}
      >
        <circleGeometry args={[110, 48]} />
        <meshStandardMaterial color="#e6cfb2" roughness={1} />
      </mesh>
      {TERRAIN.craters.map(([x, z, s], i) => (
        <Model key={`c${i}`} id="crater" position={[x, 0.0, z]} scale={s} rotation={i} />
      ))}
      {TERRAIN.rocks.map(([x, z, s], i) => (
        <Model key={`r${i}`} id="rocks" position={[x, 0.05, z]} scale={s} rotation={i * 1.3} />
      ))}
      {/* Landing zone far from the habitat, behind a regolith berm (NASA: keep exhaust ejecta off the outpost). */}
      <Model id="landing-pad" position={at3(FACILITY.lander, 0)} />
      <Model id="landing-pad" position={at3(RESCUE_PAD, 0)} scale={0.6} />
      <Model id="berm" position={at3(BERM.at, 0)} rotation={BERM.yaw} scale={BERM.scale} />
      {TERRAIN.lights.map(([x, z], i) => (
        <Model key={`l${i}`} id="path-light" position={[x, 0, z]} />
      ))}
      {/* Vertical solar arrays on tall masts catch the low south-pole Sun (NASA VSAT); cables run to the air unit. */}
      {SOLAR_TOWERS.map((at, i) => (
        <group key={`s${i}`}>
          <Model id="solar-tower" position={at3(at, 0)} rotation={SOLAR_YAW} />
          <Cable from={at} to={[FACILITY.mainAir[0] + 0.5, FACILITY.mainAir[1] - 0.2]} />
        </group>
      ))}
    </>
  );
}

/** Scenery positions: craters and rocks on the plain, lights along the walk to the pads. [x, z, scale] */
const TERRAIN = {
  craters: [
    [-9.0, -5.5, 2.2],
    [4.0, -8.2, 1.6],
    [-10.5, 4.5, 1.8],
    [12.5, -6.5, 2.4],
    [-3.5, 9.5, 1.5],
    [-15, -12, 3.5],
    [18, 12, 3],
  ] as [number, number, number][],
  rocks: [
    [-9.2, 1.0, 0.8],
    [3.0, 8.4, 0.7],
    [-5.6, 6.2, 0.6],
    [11.0, -1.4, 0.7],
    [-4.8, -7.2, 0.9],
    [14, 4, 1.1],
  ] as [number, number, number][],
  lights: [
    [5.0, 2.6],
    [6.8, 1.7],
    [11.6, 5.2],
  ] as [number, number][],
};
/** The solar blankets face the Sun, which skims the horizon at the lunar south pole. */
const SOLAR_YAW = Math.atan2(SUN[0], SUN[2]);

/** A power cable lying on the ground between two points. */
function Cable({ from, to }: { from: Vec2; to: Vec2 }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  return (
    <mesh position={[(from[0] + to[0]) / 2, 0.03, (from[1] + to[1]) / 2]} rotation-y={Math.atan2(dx, dz)}>
      <boxGeometry args={[0.07, 0.04, len]} />
      <meshStandardMaterial color="#3b3a46" flatShading />
    </mesh>
  );
}
type Vec3Like = { x: number; z: number };

/** 3×3 storage ring around the shelter (GDD v2 §6). B2 is the shelter; A2 and C2 are vents. */
function ShelterGrid({ highlight }: { highlight: boolean }) {
  return (
    <group>
      {Array.from({ length: 9 }, (_, cell) => {
        const p = cellPos(cell);
        if (cell === SHELTER_CELL)
          return (
            <group key={cell} position={at3(p)}>
              <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[0.92, 0.9, 0.92]} />
                <meshStandardMaterial color="#3d4a63" flatShading />
              </mesh>
              <mesh position={[0, 0.92, 0]}>
                <boxGeometry args={[1, 0.08, 1]} />
                <meshStandardMaterial color="#e2683a" flatShading />
              </mesh>
              <mesh position={[0, 0.33, 0.47]}>
                <boxGeometry args={[0.36, 0.56, 0.03]} />
                <meshStandardMaterial color="#f7e6c8" emissive="#33a9a0" emissiveIntensity={0.2} />
              </mesh>
            </group>
          );
        return (
          <group key={cell} position={at3(p, 0.03)}>
            <mesh>
              <boxGeometry args={[0.96, 0.06, 0.96]} />
              <meshStandardMaterial color={highlight ? "#f3d9a8" : "#ead7b8"} flatShading />
            </mesh>
            {VENTS.includes(cell) &&
              [-0.27, -0.09, 0.09, 0.27].map((x) => (
                <mesh key={x} position={[x, 0.035, 0]}>
                  <boxGeometry args={[0.08, 0.012, 0.8]} />
                  <meshStandardMaterial color="#5a98d6" />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

function Tank({ position, vertical }: { position: P3; vertical: boolean }) {
  return (
    <group position={position} rotation-y={vertical ? Math.PI / 2 : 0}>
      <mesh position={[0, 0.38, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.36, 0.36, 1.85, 10]} />
        <meshStandardMaterial color="#f4f1ea" flatShading />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.38, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.375, 0.375, 0.14, 10]} />
          <meshStandardMaterial color="#33a9a0" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function ItemModel({ id, position, rotation = 0 }: { id: WallId | "research"; position: P3; rotation?: number }) {
  if (id === "tank") return <Tank position={position} vertical={false} />;
  const model: ModelId = id.startsWith("supply")
    ? "supply"
    : id === "workshopBattery"
      ? "battery"
      : (id as ModelId);
  return <Model id={model} position={position} rotation={rotation} scale={id === "research" ? 0.8 : 1} />;
}

/** Where every loose item is drawn this frame, or nothing if it is used/not packed. */
function itemPlacements(props: SceneProps) {
  const { state, plan, carrying } = props;
  const wall = state.stage === 3 ? plan.wall : state.wall;
  const out: { id: WallId | "research"; at: P3; vertical?: boolean }[] = [];
  // Opening: the cargo only lies in the yard once the lander has touched down (shot 2 onward).
  if (props.cine?.id === "opening" && props.cine.shot === 0) return out;
  const packed = (id: string) => (state.stage === 0 ? !plan.cargo.includes(id as never) : state.cargo.includes(id as never));
  const visible: Record<WallId | "research", boolean> = {
    supply1: state.stage > 0 && state.mission.supplies >= 1,
    supply2: state.stage > 0 && state.mission.supplies >= 2,
    supply3: state.stage > 0 && state.mission.supplies >= 3,
    // The water tank is only brought out after Earth's storm warning (review: no tank from Shift 1).
    tank: state.stage >= 3 && state.forecast === "arrived",
    food: packed("food") && !state.foodOpened && !plan.openFood,
    battery: packed("battery") && !state.batteryUsed && plan.battery !== "cargo",
    kit: packed("kit") && state.gardenCare === 0 && !plan.power.includes("garden"),
    spare: packed("spare") && !state.spareInstalled && !plan.installSpare,
    research: packed("research") && state.stage < 6,
    workshopBattery:
      (plan.workshop ?? state.workshop) === "dismantle" &&
      !state.workshopBatteryUsed &&
      plan.battery !== "workshop",
  };
  for (const id of Object.keys(visible) as (WallId | "research")[]) {
    if (!visible[id] || id === carrying) continue;
    const cells = id === "research" ? null : itemCell({ ...plan, wall }, id);
    if (cells) {
      const ps = cells.map(cellPos);
      const mid: Vec2 = [(ps[0][0] + ps.at(-1)![0]) / 2, (ps[0][1] + ps.at(-1)![1]) / 2];
      out.push({ id, at: at3(mid, 0.06), vertical: cells.length > 1 && cells[1] - cells[0] === 3 });
    } else out.push({ id, at: at3(YARD[id]) });
  }
  return out;
}

function Items(props: SceneProps) {
  return (
    <>
      {itemPlacements(props).map(({ id, at, vertical }) =>
        id === "tank" ? (
          <Tank key={id} position={at} vertical={!!vertical} />
        ) : (
          <ItemModel key={id} id={id} position={at} />
        ),
      )}
      {(props.state.spareInstalled || props.plan.installSpare) && (
        <Model id="spare" position={[PIPE[0], 0.02, PIPE[1] - 0.45]} scale={0.55} />
      )}
    </>
  );
}

/** Bent habitat air pipe (S1). The middle joint turns until it lines up. */
function Pipe({ angle, flowing, animate }: { angle: number; flowing: boolean; animate: boolean }) {
  const joint = useRef<Group>(null);
  const beads = useRef<Group>(null);
  useFrame((_, delta) => {
    if (joint.current) joint.current.rotation.y += ((-angle * Math.PI) / 180 - joint.current.rotation.y) * Math.min(1, delta * 12);
    if (beads.current && flowing && animate)
      beads.current.children.forEach((bead) => {
        bead.position.x -= delta * 1.4; // from the air machine (+x) into the habitat (-x)
        if (bead.position.x < left) bead.position.x += right - left;
      });
  });
  const z = PIPE[1] - 0.25;
  // Pipe ends in the group's local x: from the habitat wall to the main air unit's face.
  const left = PIPE_ENDS[0] - PIPE[0];
  const right = PIPE_ENDS[1] - PIPE[0];
  const half = 0.31; // half the joint's length
  const segments: [number, number][] = [
    [left, -half],
    [half, right],
  ];
  return (
    <group position={[PIPE[0], 0.45, z]}>
      {segments.map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.12, 0.12, b - a, 8]} />
          <meshStandardMaterial color="#c9ccd4" flatShading />
        </mesh>
      ))}
      {/* Flanges where the pipe enters each wall. */}
      {[left + 0.06, right - 0.06].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 8]} />
          <meshStandardMaterial color="#8a8f9c" flatShading />
        </mesh>
      ))}
      <group ref={joint}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.15, 0.15, 0.62, 8]} />
          <meshStandardMaterial color={flowing ? "#33a9a0" : "#e7a837"} flatShading />
        </mesh>
      </group>
      {!flowing &&
        [0.45, 0.62, 0.79].map((x, i) => (
          <mesh key={x} position={[x, 0.24 + (i % 2) * 0.1, 0]}>
            <sphereGeometry args={[0.085, 8, 6]} />
            <meshBasicMaterial color="#8fd3ff" />
          </mesh>
        ))}
      {flowing && (
        <group ref={beads}>
          {[0, 0.25, 0.5, 0.75].map((f) => left + (right - left) * f).map((x) => (
            <mesh key={x} position={[x, 0.24, 0]}>
              <sphereGeometry args={[0.05, 6, 4]} />
              <meshBasicMaterial color="#8fd3ff" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Fan({ running, animate }: { running: boolean; animate: boolean }) {
  const object = useMemo(() => models.get("fan")!.clone(true), []);
  const rotor = useMemo(() => object.getObjectByName("Fan_Rotor"), [object]);
  useFrame((_, delta) => {
    if (running && animate && rotor) rotor.rotation.z += Math.min(delta, 0.05) * 8;
  });
  return <primitive object={object} position={[SHELTER[0] + 1.75, 0.03, SHELTER[1] - 1.05]} scale={1.1} dispose={null} />;
}

function Glow({ position, color }: { position: P3; color: string }) {
  return (
    <mesh position={position}>
      <icosahedronGeometry args={[0.16, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
}

/** Amber ring = "you can use this" (team colour rule). Grey ring = explains only. */
function Rings({ props, focus }: { props: SceneProps; focus: string | null }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || props.reducedMotion) return;
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.07;
    group.current.children.forEach((child) => {
      if (child.userData.pulse) child.scale.set(s, 1, s);
    });
  });
  if (props.mode !== "play" || props.controlsLocked) return null;
  return (
    <group ref={group}>
      {props.interactables.map((item) => (
        <group key={item.id} position={at3(item.at, 0.06)} userData={{ pulse: !item.info }}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[focus === item.id ? 0.5 : 0.38, focus === item.id ? 0.6 : 0.46, 24]} />
            <meshBasicMaterial
              color={item.info ? "#9aa3b2" : focus === item.id ? "#f4b23a" : "#e7a837"}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[0, 0.5, 0]}
            onClick={(event) => {
              event.stopPropagation();
              props.onPick(item.id);
            }}
          >
            <cylinderGeometry args={[0.5, 0.5, 1, 8]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Opening shot 4: particles drawn as coral beams from the Sun toward the outpost. */
const SUN_TARGETS: P3[] = [
  [FACILITY.habitat[0], 0.8, FACILITY.habitat[1]],
  [FACILITY.mainAir[0], 0.8, FACILITY.mainAir[1]],
  [CREW_HOME[1][0], 0.8, CREW_HOME[1][1]],
  [SHELTER[0], 0.8, SHELTER[1]],
];
function SunBeams() {
  const beams = useMemo(
    () =>
      SUN_TARGETS.map((target) => {
        const start = new Vector3(...SUN);
        const end = new Vector3(...target);
        const holder = new Object3D();
        holder.position.copy(start).add(end).multiplyScalar(0.5);
        holder.lookAt(end);
        return { mid: holder.position.clone(), rotation: holder.rotation.clone(), length: start.distanceTo(end) };
      }),
    [],
  );
  return (
    <>
      {beams.map((beam, i) => (
        <mesh key={i} position={beam.mid} rotation={beam.rotation}>
          <boxGeometry args={[0.07, 0.07, beam.length]} />
          <meshBasicMaterial color="#ff6b5a" />
        </mesh>
      ))}
    </>
  );
}

/** Kacamata Partikel: lines from outside stop at crates, pass through gaps (Interaksi §8). */
function ParticleLines({ wall }: { wall: (WallId | null)[] }) {
  const lines = useMemo(() => {
    return Array.from({ length: 9 }, (_, cell) => cell)
      .filter((cell) => cell !== SHELTER_CELL)
      .map((cell) => {
        const p = cellPos(cell);
        const dx = p[0] - SHELTER[0];
        const dz = p[1] - SHELTER[1];
        const len = Math.hypot(dx, dz);
        const start = new Vector3(p[0] + (dx / len) * 3, 2.2, p[1] + (dz / len) * 3);
        const blocked = !!wall[cell];
        const end = blocked ? new Vector3(p[0], 0.55, p[1]) : new Vector3(SHELTER[0], 0.6, SHELTER[1]);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const length = start.distanceTo(end);
        const holder = new Object3D();
        holder.position.copy(mid);
        holder.lookAt(end);
        return { cell, blocked, mid, length, rotation: holder.rotation.clone(), end };
      });
  }, [wall]);
  return (
    <>
      {lines.map((line) => (
        <group key={line.cell}>
          <mesh position={line.mid} rotation={line.rotation}>
            <boxGeometry args={[0.06, 0.06, line.length]} />
            <meshBasicMaterial color={line.blocked ? "#ffd166" : "#ff6b5a"} />
          </mesh>
          {line.blocked && (
            <mesh position={line.end}>
              <icosahedronGeometry args={[0.13, 0]} />
              <meshBasicMaterial color="#fff1b8" />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

/** Soft particle "snow" during the storm; off with reduced motion. */
function StormSnow() {
  const ref = useRef<InstancedMesh>(null);
  const COUNT = 70;
  const seeds = useMemo(
    () => Array.from({ length: COUNT }, () => [Math.random() * 14 - 7, Math.random() * 8, Math.random() * 12 - 6] as P3),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, delta) => {
    if (!ref.current) return;
    seeds.forEach((seed, i) => {
      seed[1] -= delta * 0.9;
      if (seed[1] < 0) seed[1] = 8;
      dummy.position.set(...seed);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <icosahedronGeometry args={[0.04, 0]} />
      <meshBasicMaterial color="#fff4c2" />
    </instancedMesh>
  );
}

function Crew({ props }: { props: SceneProps }) {
  const { state, plan, mode } = props;
  const home: Vec2[] = CREW_HOME;
  const inShelter = (state.stage === 4 && plan.moveCrew) || (state.stage === 4 && props.phase !== "play" && state.crewMoved);
  const spots: Vec2[] =
    mode === "menu"
      ? home
      : inShelter
        ? [
            [SHELTER[0] - 0.25, SHELTER[1] + 0.75],
            [SHELTER[0] + 0.25, SHELTER[1] + 0.75],
            [SHELTER[0], SHELTER[1] + 0.55],
          ]
        : state.stage === 1
          ? [home[0], [PIPE[0] - 0.45, PIPE[1] - 0.7], home[2]]
          : state.stage === 2
            ? [home[0], [FACILITY.workshop[0] + 1.4, FACILITY.workshop[1] + 1.6], [FACILITY.workshop[0] - 1.3, FACILITY.workshop[1] + 1.6]]
            : state.stage >= 6
              ? PICKUP_SPOTS
              : home;
  const ids: ModelId[] = ["crew-a", "crew-b", "crew-c"];
  const carryingTank = props.carrying === "tank";
  return (
    <>
      {ids.map((id, i) =>
        carryingTank && id === "crew-b" ? null : (
          <Walker key={id} to={spots[i]} reducedMotion={props.reducedMotion} scale={inShelter ? 0.4 : 0.5}>
            <Model id={id} rotation={0.2 - i * 0.2} />
          </Walker>
        ),
      )}
    </>
  );
}

function Walker({ to, reducedMotion, scale, children }: { to: Vec2; reducedMotion: boolean; scale: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (ref.current && (first.current || reducedMotion)) ref.current.position.set(to[0], 0.03, to[1]);
    first.current = false;
  }, [to[0], to[1], reducedMotion]);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const dx = to[0] - g.position.x;
    const dz = to[1] - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.02) {
      const step = Math.min(d, delta * 3.2);
      g.position.x += (dx / d) * step;
      g.position.z += (dz / d) * step;
      g.rotation.y = Math.atan2(dx, dz);
      g.position.y = 0.03 + Math.abs(Math.sin(performance.now() / 90)) * 0.05;
    } else g.position.y = 0.03;
    g.scale.setScalar(scale);
  });
  return <group ref={ref}>{children}</group>;
}

/** Third-person B.E.E.P.: WASD/arrows or tap to walk; reports the nearest usable object. */
function Beep({ props, beep }: { props: SceneProps; beep: React.RefObject<Group | null> }) {
  const keys = useRef(new Set<string>());
  const target = useRef<{ at: Vec2; id: string | null } | null>(null);
  const focus = useRef<string | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (el.closest("input, textarea, select, dialog, [data-own-keys]")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        if (latest.current.controlsLocked || latest.current.mode !== "play") return;
        keys.current.add(key);
        target.current = null;
        if (key.startsWith("arrow")) event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
  useEffect(() => {
    if (props.walk) target.current = { at: props.walk.at, id: props.walk.id };
  }, [props.walk?.nonce]);
  useLayoutEffect(() => {
    // New stage or replay: B.E.E.P. starts in the yard.
    beep.current?.position.set(BEEP_START[0], 0.02, BEEP_START[1]);
    target.current = null;
  }, [props.state.stage, props.mode]);
  useFrame((_, rawDelta) => {
    const g = beep.current;
    const p = latest.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.1);
    let dx = 0;
    let dz = 0;
    if (!p.controlsLocked && p.mode === "play") {
      const k = keys.current;
      if (k.has("w") || k.has("arrowup")) dz -= 1;
      if (k.has("s") || k.has("arrowdown")) dz += 1;
      if (k.has("a") || k.has("arrowleft")) dx -= 1;
      if (k.has("d") || k.has("arrowright")) dx += 1;
      if ((dx || dz) && p.yaw) {
        // Keys are screen-relative: rotate them with the camera so W stays "into the screen".
        const c = Math.cos(p.yaw);
        const s = Math.sin(p.yaw);
        [dx, dz] = [dx * c + dz * s, -dx * s + dz * c];
      }
      if (!dx && !dz && target.current) {
        const tx = target.current.at[0] - g.position.x;
        const tz = target.current.at[1] - g.position.z;
        const d = Math.hypot(tx, tz);
        const stop = target.current.id ? 0.55 : 0.08;
        if (d <= stop) {
          const id = target.current.id;
          target.current = null;
          p.onArrive(id);
        } else {
          dx = tx / d;
          dz = tz / d;
        }
      }
    } else keys.current.clear();
    const moving = dx || dz;
    if (moving) {
      const len = Math.hypot(dx, dz);
      const speed = SPEED * (p.carrying === "tank" ? 0.55 : 1);
      g.position.x += (dx / len) * speed * delta;
      g.position.z += (dz / len) * speed * delta;
      for (const o of OBSTACLES) {
        const ox = g.position.x - o.at[0];
        const oz = g.position.z - o.at[1];
        const d = Math.hypot(ox, oz);
        const min = o.r + 0.35;
        if (d < min && d > 1e-4) {
          g.position.x = o.at[0] + (ox / d) * min;
          g.position.z = o.at[1] + (oz / d) * min;
          // Slide around the obstacle instead of stopping dead against it.
          let tx = -oz / d;
          let tz = ox / d;
          if (tx * dx + tz * dz < 0) {
            tx = -tx;
            tz = -tz;
          }
          g.position.x += tx * speed * delta * 0.9;
          g.position.z += tz * speed * delta * 0.9;
        }
      }
      const sx = g.position.x / ISLAND.rx;
      const sz = (g.position.z - ISLAND.cz) / ISLAND.rz;
      const r = Math.hypot(sx, sz);
      if (r > 1) {
        g.position.x /= r;
        g.position.z = ISLAND.cz + (g.position.z - ISLAND.cz) / r;
      }
      const heading = Math.atan2(dx, dz);
      let turn = heading - g.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      g.rotation.y += turn * Math.min(1, delta * 12);
      g.position.y = 0.02 + Math.abs(Math.sin(performance.now() / 80)) * 0.04;
    } else if (p.state.stage >= 6 && ending(p.state) === "safe" && !p.reducedMotion) {
      // Happy dance at the rescue.
      const t = performance.now();
      g.position.y = 0.02 + Math.abs(Math.sin(t / 160)) * 0.35;
      g.rotation.y += delta * 4;
    } else g.position.y = 0.02;
    // Nearest usable object.
    let best: string | null = null;
    let bestD = FOCUS_RADIUS;
    for (const item of p.interactables) {
      const d = Math.hypot(item.at[0] - g.position.x, item.at[1] - g.position.z);
      if (d < bestD) {
        bestD = d;
        best = item.id;
      }
    }
    if (p.mode !== "play") best = null;
    if (best !== focus.current) {
      focus.current = best;
      p.onFocus(best);
    }
  });
  return (
    <group ref={beep} position={at3(BEEP_START, 0.02)}>
      <Model id="beep" scale={0.47} />
      {props.carrying && (
        <group position={[0, 0.95, 0]} scale={props.carrying === "tank" ? 0.6 : 0.8}>
          <ItemModel id={props.carrying} position={[0, 0, 0]} />
        </group>
      )}
      {props.carrying === "tank" && (
        <group position={[0.75, 0, -0.2]} scale={0.5}>
          <Model id="crew-b" />
        </group>
      )}
    </group>
  );
}

const DOTS = 22;
const ARROWS = 6;
/**
 * Live route: glowing dots flow from B.E.E.P. to the nearest goal, with a bobbing arrow on it.
 * For a choice, every option gets the same arrow and there is no route (no nudge to the nearest).
 * shortcut: straight line, ignores buildings; B.E.E.P. slides around them anyway. Add pathfinding if kids get stuck.
 */
function RouteHint({ props, beep, focus }: { props: SceneProps; beep: React.RefObject<Group | null>; focus: string | null }) {
  const dots = useRef<InstancedMesh>(null);
  const arrows = useRef<(Group | null)[]>([]);
  const dummy = useMemo(() => new Object3D(), []);
  const latest = useRef(props);
  latest.current = props;
  const focusRef = useRef(focus);
  focusRef.current = focus;
  useFrame(() => {
    const p = latest.current;
    const b = beep.current?.position;
    const live = !!b && p.mode === "play" && !p.controlsLocked;
    const goals = live ? p.interactables.filter((item) => p.guide.includes(item.id)) : [];
    let best: Vec2 | null = null;
    let bestD = Infinity;
    for (const item of goals) {
      const d = Math.hypot(item.at[0] - b!.x, item.at[1] - b!.z);
      if (d < bestD) [best, bestD] = [item.at, d];
    }
    const marked = (p.guideChoice ? goals : goals.filter((g) => g.at === best)).filter((g) => g.id !== focusRef.current).map((g) => g.at);
    const bob = p.reducedMotion ? 0 : Math.sin(performance.now() / 220) * 0.1;
    arrows.current.forEach((arrow, i) => {
      if (!arrow) return;
      arrow.visible = i < marked.length;
      // Low enough to read as "this one", not as a sign floating over the next building.
      if (arrow.visible) arrow.position.set(marked[i][0], 1.15 + bob, marked[i][1]);
      arrow.scale.setScalar(p.guideChoice ? 0.7 : 1);
    });
    const mesh = dots.current;
    if (!mesh) return;
    mesh.visible = !p.guideChoice && !!best && bestD > 1.1;
    if (!mesh.visible || !best || !b) return;
    const flow = p.reducedMotion ? 0 : (performance.now() / 900) % 1;
    for (let i = 0; i < DOTS; i++) {
      const f = (i + flow) / DOTS;
      // Fade the line in near B.E.E.P. and out at the goal.
      const size = f < 0.06 || f > 0.94 ? 0 : 1 - Math.abs(f - 0.5) * 0.6;
      dummy.position.set(b.x + (best[0] - b.x) * f, 0.1, b.z + (best[1] - b.z) * f);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshBasicMaterial color="#ffc23d" />
      </instancedMesh>
      {Array.from({ length: ARROWS }, (_, i) => (
        <group key={i} ref={(g) => void (arrows.current[i] = g)} visible={false}>
          <mesh rotation-x={Math.PI}>
            <coneGeometry args={[0.24, 0.45, 4]} />
            <meshBasicMaterial color="#ffb21f" />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 6]} />
            <meshBasicMaterial color="#ffb21f" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** A lander that drops in on its cutscene's first shot (retro flame), kicking up dust on the second. */
function Lander({ at, rotation, scale, tilt, cine, scene, height }: { at: Vec2; rotation: number; scale: number; tilt: number; cine: Cine | null; scene: Cine["id"]; height: number }) {
  const body = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  const dust = useRef<Group>(null);
  useFrame(() => {
    const g = body.current;
    if (!g) return;
    const active = cine?.id === scene ? cine : null;
    const t = active ? shotProgress(active) : 1;
    const falling = active?.shot === 0;
    g.position.y = falling ? 0.05 + height * (1 - t) ** 2 : 0.05;
    if (flame.current) {
      flame.current.visible = falling && t < 0.98;
      flame.current.scale.y = 0.8 + Math.random() * 0.4;
    }
    if (dust.current) {
      const puff = active?.shot === 1 ? t : falling && t > 0.85 ? 0 : 1;
      dust.current.visible = puff < 1;
      dust.current.children.forEach((m, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.9 + puff * 2.2;
        m.position.set(Math.cos(a) * r, 0.25 + puff * 0.4, Math.sin(a) * r);
        m.scale.setScalar(0.7 * (1 - puff) + 0.15);
      });
    }
  });
  return (
    <group position={at3(at, 0)}>
      <group ref={body} rotation-z={tilt}>
        <Model id="lander" rotation={rotation} scale={scale} />
        <mesh ref={flame} position={[0, -0.55 * (scale / 0.75), 0]} rotation-x={Math.PI} visible={false}>
          <coneGeometry args={[0.45 * (scale / 0.75), 1.3 * (scale / 0.75), 10]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.85} />
        </mesh>
      </group>
      <group ref={dust} visible={false}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color="#e6cfb2" flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The Sun, low on the horizon. Breathes in the opening, bursts in the flare cutscene. */
export const SPACE = "#05070d";
/** The radio dish (front = +Z) turns to face Earth, low on the horizon at the lunar south pole. */
const RADIO_YAW = Math.atan2(EARTH[0] - FACILITY.radio[0], EARTH[2] - FACILITY.radio[1]);

/** A fixed starfield on a far sphere (seeded, so it is the same every visit). */
function Stars() {
  const geometry = useMemo(() => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      // Keep stars above the horizon (the island hides the rest anyway).
      const y = Math.abs(u) * 0.95 + 0.02;
      pos.set([r * Math.cos(a) * 90, y * 90 - 8, r * Math.sin(a) * 90], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial color="#e8eefc" size={1.6} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
}

/** Earth hangs low over the horizon, as seen from the lunar south pole. */
function Earth() {
  return (
    <group position={EARTH}>
      <mesh>
        <sphereGeometry args={[2.1, 24, 16]} />
        <meshBasicMaterial color="#3f7fd0" />
      </mesh>
      <mesh position={[0.6, 0.7, 1.2]} scale={[1, 0.45, 0.7]}>
        <sphereGeometry args={[1.25, 12, 8]} />
        <meshBasicMaterial color="#5ea05a" />
      </mesh>
      <mesh position={[-0.7, -0.4, 1.4]} scale={[1.1, 0.3, 0.6]}>
        <sphereGeometry args={[1.1, 12, 8]} />
        <meshBasicMaterial color="#f2f5fa" />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.3, 24, 16]} />
        <meshBasicMaterial color="#6fa8e8" side={BackSide} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Sun({ cine }: { cine: Cine | null }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const flare = cine?.id === "flare" && cine.shot === 0 ? Math.sin(shotProgress(cine) * Math.PI) * 0.9 : 0;
    const wake = cine?.id === "opening" && cine.shot === 3 ? Math.abs(Math.sin(performance.now() / 400)) * 0.15 : 0;
    ref.current.scale.setScalar(1 + flare + wake);
  });
  return (
    <group ref={ref} position={SUN}>
      <mesh>
        <sphereGeometry args={[2.8, 20, 12]} />
        <meshBasicMaterial color="#fff1b8" />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.2, 20, 12]} />
        <meshBasicMaterial color="#ffd77a" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraRig({ props, beep, labels }: { props: SceneProps; beep: React.RefObject<Group | null>; labels: LabelSpec[] & { refs: (HTMLSpanElement | null)[] } }) {
  const { camera, size, gl, scene, setDpr, invalidate } = useThree();
  const look = useMemo(() => new Vector3(0, 0, 0.5), []);
  const goal = useMemo(() => new Vector3(), []);
  const goalLook = useMemo(() => new Vector3(), []);
  const introAt = useRef(0);
  useEffect(() => {
    introAt.current = performance.now();
  }, [props.intro, props.state.stage]);
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.aspect = size.width / Math.max(1, size.height);
    cam.fov = size.width < 761 ? 52 : 42;
    cam.updateProjectionMatrix();
    const cap = props.lowGraphics ? 1 : size.width < 761 ? 1.25 : 1.5;
    setDpr(Math.min(devicePixelRatio, cap, Math.sqrt(2_000_000 / Math.max(1, size.width * size.height))));
    invalidate();
  }, [camera, size.width, size.height, props.lowGraphics, setDpr, invalidate]);
  useEffect(() => {
    for (const material of sharedMaterials.values())
      if (material instanceof MeshStandardMaterial && material.name === "M_Glass") {
        material.transparent = !props.lowGraphics;
        material.opacity = props.lowGraphics ? 1 : 0.35;
        material.depthWrite = props.lowGraphics;
        material.needsUpdate = true;
      }
  }, [props.lowGraphics]);
  useEffect(() => {
    let canceled = false;
    gl.compileAsync(scene, camera)
      .then(() => {
        if (!canceled) requestAnimationFrame(() => !canceled && props.onReady());
      })
      .catch((error) => {
        console.error(error);
        props.onError();
      });
    return () => {
      canceled = true;
    };
  }, [gl, scene, camera]);
  const projected = useMemo(() => new Vector3(), []);
  const ray = useMemo(() => new Raycaster(), []);
  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);
  const occlusion = useRef({ at: 0, hidden: false });
  const placeLabels = () =>
    labels.forEach((label, i) => {
      const element = labels.refs[i];
      if (!element) return;
      projected.set(...label.at).project(camera);
      const x = ((projected.x + 1) * size.width) / 2;
      const y = ((-projected.y + 1) * size.height) / 2;
      element.style.visibility = projected.z > 1 || x < 20 || x > size.width - 20 || y < 20 || y > size.height - 10 ? "hidden" : "visible";
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    });
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const b = beep.current?.position ?? new Vector3(...at3(BEEP_START));
    const zoom = props.zoom;
    const narrow = size.width < 761;
    const gesturePoint: Record<Gesture, Vec2> = {
      pipe: PIPE,
      antenna: [FACILITY.radio[0], FACILITY.radio[1] + 0.4],
      harvest: FACILITY.garden,
      foodpack: YARD.food,
      workshop: FACILITY.workshop,
    };
    const nearShelter = Math.hypot(b.x - SHELTER[0], b.z - SHELTER[1]) < 3.4;
    const cine = props.cine;
    if (cine && props.mode === "play") {
      const shot = cine.shots[cine.shot];
      const t = props.reducedMotion ? 1 : ease(shotProgress(cine));
      camera.position.set(...shot.from.pos).lerp(goal.set(...shot.to.pos), t);
      look.set(...shot.from.look).lerp(goalLook.set(...shot.to.look), t);
      if (shot.shake && !props.reducedMotion) {
        const k = 0.18 * (1 - shotProgress(cine)) ** 2;
        const n = performance.now();
        camera.position.x += Math.sin(n / 21) * k;
        camera.position.y += Math.sin(n / 17) * k;
      }
      camera.lookAt(look);
      camera.updateMatrixWorld();
      placeLabels();
      return;
    }
    if (props.mode === "menu") {
      // Low enough to see the black sky over the horizon.
      goalLook.set(-1.2, 1.6, 0);
      goal.set(7.5, 6.2, 15.5);
    } else if (props.intro && performance.now() - introAt.current < 1600) {
      goalLook.set(1, 0.5, 1);
      goal.set(1, 18, 16);
    } else if (props.gesture) {
      const g = gesturePoint[props.gesture];
      goalLook.set(g[0], 0.6, g[1]);
      goal.set(g[0] + 0.6, 4.6, g[1] + 3.0); // high enough to see over B.E.E.P. standing at the object
    } else if ((props.state.stage === 3 || props.goggles) && nearShelter && props.phase === "play") {
      // Top view while building the wall, so cells are easy to aim at.
      goalLook.set(SHELTER[0], 0.3, SHELTER[1]);
      goal.set(SHELTER[0], 9.5 / zoom, SHELTER[1] + 4.2 / zoom);
    } else if (props.state.stage >= 6) {
      goalLook.set(1.5, 0.8, 1.5);
      goal.set(5, 11, 13.5);
    } else {
      goalLook.set(b.x, 0.7, b.z);
      goal.set(b.x, b.y + (narrow ? 7.5 : 6.2) / zoom, b.z + (narrow ? 8.5 : 7.4) / zoom);
    }
    // The menu renders on demand, so it cannot rely on a multi-frame lerp.
    if (props.mode === "play" && props.yaw) {
      // Orbit the chosen view around what it looks at.
      const ox = goal.x - goalLook.x;
      const oz = goal.z - goalLook.z;
      const c = Math.cos(props.yaw);
      const s = Math.sin(props.yaw);
      goal.x = goalLook.x + ox * c + oz * s;
      goal.z = goalLook.z - ox * s + oz * c;
    }
    if (props.mode === "play" && !props.gesture && beep.current) {
      const now = performance.now();
      if (now - occlusion.current.at > 200) {
        occlusion.current.at = now;
        from.set(b.x, b.y + 0.6, b.z);
        to.copy(goal).sub(from);
        const dist = to.length();
        ray.set(from, to.normalize());
        ray.far = dist;
        occlusion.current.hidden = ray
          .intersectObjects(scene.children, true)
          .some((hit) => hit.object instanceof Mesh && !(hit.object instanceof InstancedMesh) && hit.object.material instanceof MeshStandardMaterial && !isInside(hit.object, beep.current!));
      }
      if (occlusion.current.hidden) {
        // Look down from above: buildings can't stand between the camera and B.E.E.P.
        goal.set(goalLook.x + (goal.x - goalLook.x) * 0.3, goal.y + 5, goalLook.z + (goal.z - goalLook.z) * 0.3);
      }
    }
    const t = props.reducedMotion || props.mode === "menu" ? 1 : Math.min(1, delta * 4);
    camera.position.lerp(goal, t);
    look.lerp(goalLook, t);
    camera.lookAt(look);
    placeLabels();
    if (import.meta.env.DEV || location.search.includes("diagnostics"))
      (window as unknown as { __moonshiftMetrics: unknown }).__moonshiftMetrics = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        frame: gl.info.render.frame,
        beep: [b.x, b.z],
      };
  });
  return null;
}

function isInside(object: Object3D, parent: Object3D) {
  for (let o: Object3D | null = object; o; o = o.parent) if (o === parent) return true;
  return false;
}

interface LabelSpec {
  key: string;
  text: string;
  sub?: string;
  at: P3;
  focus?: boolean;
  tone?: string;
}

/** Names on the world itself while the story introduces it (spatial contiguity), then gone. */
function storyTags(props: SceneProps): LabelSpec[] {
  if (props.mode !== "play") return [];
  const cine = props.cine;
  if (cine?.id === "opening" && cine.shot === 1)
    return [
      { key: "t:lander", text: "cargo lander", at: at3(FACILITY.lander, 2.0), tone: "tone-ink" },
      { key: "t:cargo", text: "cargo", at: [YARD.research[0], 1.0, YARD.research[1]], tone: "tone-cargo" },
    ];
  if (cine?.id === "opening" && cine.shot === 2)
    return [
      { key: "t:a", text: "Commander", at: at3(CREW_HOME[0], 1.12), tone: "tone-commander" },
      { key: "t:b", text: "Technician", at: at3(CREW_HOME[1], 1.12), tone: "tone-technician" },
      { key: "t:c", text: "Researcher", at: at3(CREW_HOME[2], 1.12), tone: "tone-researcher" },
      { key: "t:you", text: "You: B.E.E.P.", at: at3(BEEP_START, 1.0), tone: "tone-you" },
    ];
  if (cine?.id === "opening" && cine.shot === 3)
    return [
      { key: "t:sun", text: "Sun", at: [SUN[0], SUN[1] + 3.2, SUN[2]], tone: "tone-danger" },
      { key: "t:earth", text: "Earth", at: [EARTH[0], EARTH[1] + 3.0, EARTH[2]], tone: "tone-air" },
      { key: "t:particles", text: "particles", at: new Vector3(...SUN_TARGETS[1]).lerp(new Vector3(...SUN), 0.3).toArray(), tone: "tone-danger" },
    ];
  if (!cine && props.phase === "play" && !props.gesture) {
    const s = props.state;
    const nasa = s.mission.storm.key === "sep2017";
    const tags: LabelSpec[] = [];
    if (s.stage >= 3 && s.stage <= 4)
      tags.push({ key: "d:storm", text: nasa ? "Real NASA data" : "Real NOAA data", sub: `${s.mission.storm.label} storm`, at: [SHELTER[0], 2.1, SHELTER[1]], tone: "tone-nasa" });
    if (s.stage === 3 && s.forecast === "arrived" && nasa)
      tags.push({ key: "d:radio", text: "NASA forecast", sub: "DONKI", at: at3(FACILITY.radio, 2.7), tone: "tone-nasa" });
    if (s.stage === 5 && researchReady(s))
      tags.push({ key: "d:osdr", text: "Real NASA plant study", sub: "OSDR OSD-267", at: at3(FACILITY.radio, 2.7), tone: "tone-nasa" });
    if (tags.length) return tags;
  }
  if (!cine && props.gesture === "pipe" && props.state.stage === 1)
    return [
      { key: "t:air", text: "fan", at: at3(FACILITY.mainAir, 1.15), tone: "tone-air" },
      { key: "t:joint", text: "bent joint", at: [PIPE[0], 0.75, PIPE[1] - 0.25], tone: "tone-cargo" },
      { key: "t:habitat", text: "habitat", at: [FACILITY.habitat[0] + 0.6, 1.9, FACILITY.habitat[1]], tone: "tone-ink" },
    ];
  return [];
}

function labelSpecs(props: SceneProps, focus: string | null): LabelSpec[] {
  if (props.mode !== "play" || props.controlsLocked) return [];
  const list: LabelSpec[] = [];
  const focused = props.interactables.find((item) => item.id === focus);
  if (focused) list.push({ key: `f:${focused.id}`, text: focused.label, at: at3(focused.at, 1.0), focus: true });
  if (props.scanning) {
    for (const item of itemPlacements(props)) {
      const info = item.id in CARGO ? CARGO[item.id as keyof typeof CARGO] : null;
      list.push({
        key: `s:${item.id}`,
        text: item.id === "research" ? "Research crate" : wallName(item.id as WallId),
        sub: info ? `Use: ${info.use} · ${info.wall}` : item.id === "tank" ? "Wall: 2 cells · needs Earth's warning" : "Wall: 1 cell",
        at: [item.at[0], 1.25, item.at[2]],
      });
    }
    const names: [string, Vec2][] = [
      ["Habitat", FACILITY.habitat],
      ["Garden", FACILITY.garden],
      ["Workshop", FACILITY.workshop],
      ["Radio", FACILITY.radio],
      ["Shelter", SHELTER],
    ];
    for (const [text, at] of names) list.push({ key: `n:${text}`, text, at: at3(at, 2.4) });
  }
  return list;
}

function World({ props, labels, focus }: { props: SceneProps; labels: LabelSpec[] & { refs: (HTMLSpanElement | null)[] }; focus: string | null }) {
  const beep = useRef<Group>(null);
  const { state, plan } = props;
  const animate = !props.reducedMotion && !props.paused;
  const dismantled = (plan.workshop ?? state.workshop) === "dismantle";
  const wall = state.stage === 3 ? plan.wall : state.wall;
  const storm = state.stage === 4;
  // The Moon has no air to scatter sunlight, so its sky is black with stars even by day.
  const sky = props.goggles ? "#101a2e" : props.cine?.id === "flare" ? "#2a1408" : storm ? "#0b1124" : SPACE;
  return (
    <>
      <color attach="background" args={[sky]} />
      <Stars />
      <Earth />
      <hemisphereLight args={["#c0d8ec", "#e6cfb2", props.goggles ? 0.7 : 2.2]} />
      <directionalLight position={[2, 9, 6]} color="#ffe2b8" intensity={props.goggles ? 0.6 : 2.7} />
      <Island
        onGround={(point) => {
          if (props.mode === "play" && !props.controlsLocked) props.onPick(`ground:${point.x.toFixed(2)},${point.z.toFixed(2)}`);
        }}
      />
      <Model id="habitat" position={at3(FACILITY.habitat, 0.02)} />
      <Model id="garden" position={at3(FACILITY.garden, 0.02)} />
      <Model id={dismantled ? "workshop-dismantled" : "workshop"} position={at3(FACILITY.workshop, 0.02)} />
      <Model id="radio" position={at3(FACILITY.radio, 0.02)} scale={0.9} rotation={RADIO_YAW} />
      <Model id="main-air" position={at3(FACILITY.mainAir, 0.02)} scale={0.85} />
      <Lander at={FACILITY.lander} rotation={-0.7} scale={0.75} tilt={0.07} cine={props.mode === "play" ? props.cine : null} scene="opening" height={14} />
      {state.stage >= 6 && <Lander at={RESCUE_AT} rotation={0.4} scale={0.5} tilt={0} cine={props.cine} scene="rescue" height={9} />}
      <Sun cine={props.cine} />
      {props.mode === "play" && props.cine?.id === "opening" && props.cine.shot === 3 && <SunBeams />}
      <ShelterGrid highlight={state.stage === 3 && !!props.carrying} />
      <Fan running={state.stage === 4 && (plan.moveCrew || state.crewMoved)} animate={animate} />
      <Pipe angle={state.stage === 1 ? props.pipeAngle : 0} flowing={state.pipeFixed || plan.pipeFixed} animate={animate} />
      <Items {...props} />
      {plan.power.includes("garden") || (state.gardenCare > 0 && state.stage < 6) ? (
        <Glow position={[FACILITY.garden[0], 1.4, FACILITY.garden[1]]} color="#f4b23a" />
      ) : null}
      {(plan.power.includes("lamp") || (state.lampLit && state.stage === 4)) && (
        <Glow position={[FACILITY.workshop[0] + 0.6, 1.3, FACILITY.workshop[1] + 0.9]} color="#c77dff" />
      )}
      {plan.power.includes("radio") && <Glow position={[FACILITY.radio[0], 2.6, FACILITY.radio[1]]} color="#33a9a0" />}
      {(props.goggles || (storm && props.phase !== "play")) && <ParticleLines wall={wall} />}
      {storm && animate && <StormSnow />}
      <Crew props={props} />
      <Beep props={props} beep={beep} />
      <Rings props={props} focus={focus} />
      <RouteHint props={props} beep={beep} focus={focus} />
      <CameraRig props={props} beep={beep} labels={labels} />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [loaded, setLoaded] = useState(models.size === manifest.models.length);
  const [focus, setFocus] = useState<string | null>(null);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    consumers++;
    clearTimeout(cleanupTimer);
    let active = true;
    loadAssets((value) => active && props.onProgress(value))
      .then(() => {
        if (active) {
          props.onProgress(1);
          setLoaded(true);
        }
      })
      .catch((error) => {
        console.error(error);
        if (active) props.onError();
      });
    return () => {
      active = false;
      consumers--;
      cleanupTimer = setTimeout(() => {
        // Dev keeps the cache: a hot reload's old timer would otherwise empty the shared models under the new Scene.
        if (!consumers && !pending && !import.meta.hot) disposeCache();
      }, 300);
    };
  }, []);
  const wrapped: SceneProps = {
    ...props,
    onFocus: (id) => {
      setFocus(id);
      props.onFocus(id);
    },
  };
  const specs = [...storyTags(props), ...labelSpecs(props, focus)];
  const labels = Object.assign(specs, { refs: refs.current });
  if (!loaded) return null;
  return (
    <>
      <Canvas
        flat
        frameloop={props.paused || props.mode === "menu" ? "demand" : "always"}
        camera={{ position: [9, 10.5, 12], near: 0.1, far: 120, fov: 42 }}
        dpr={1}
        gl={{ antialias: !props.lowGraphics, alpha: false, powerPreference: "default" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color(SPACE));
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            // R3F force-loses the old canvas ~500 ms after unmount (Retry 3D, hot reload): not a real failure.
            if (gl.domElement.isConnected) props.onError();
          });
        }}
        fallback={<div role="alert">This outpost needs a browser with WebGL 2.</div>}
      >
        <World props={wrapped} labels={labels} focus={focus} />
      </Canvas>
      <div className="world-labels" aria-hidden="true">
        {specs.map((label, i) => (
          <span
            key={label.key}
            className={`world-label ${label.focus ? "focus" : ""} ${label.tone ? `tag ${label.tone}` : ""}`}
            ref={(element) => {
              refs.current[i] = element;
            }}
          >
            {label.text}
            {label.sub && <small>{label.sub}</small>}
          </span>
        ))}
      </div>
    </>
  );
}
