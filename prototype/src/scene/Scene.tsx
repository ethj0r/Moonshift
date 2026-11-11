import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import manifest from "../../asset-manifest.json";
import {
  footprint,
  occupied,
  ROUTES,
  ROUTE_CELL,
  routeStatus,
  type Draft,
  type Item,
  type Phase,
  type Snapshot,
} from "../game/rules";

type ModelId = (typeof manifest.models)[number]["id"];
type Panel = "cargo" | "air" | "garden" | "workshop" | "radio";
type Position = [number, number, number];
interface Props {
  activePanel: Panel;
  state: Snapshot;
  draft: Draft;
  phase: Phase;
  selected: Item | null;
  vertical: boolean;
  focusedCell: number | null;
  interactive: boolean;
  paused: boolean;
  menu: boolean;
  lowGraphics: boolean;
  reducedMotion: boolean;
  zoom: number;
  overview: boolean;
  onCell: (cell: number) => void;
  onItem: (item: Item) => void;
  onFacility: (panel: Panel) => void;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onError: () => void;
}
const models = new Map<string, Group>();
const sharedMaterials = new Map<string, Material>();
let pending: Promise<void> | null = null;
let consumers = 0;
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
const BASE = import.meta.env.BASE_URL;
const BOARD: Position = [1.15, 0, 3.1];
const TO_SHELTER: Position[] = [
  [-2.1, 0.03, -0.6],
  [3.7, 0.03, -0.6],
];
const FROM_SHELTER: Position[] = [
  [3.7, 0.03, -0.6],
  [-2.1, 0.03, -0.6],
];
const SPOTS: Record<Panel, Position> = {
  cargo: [-0.8, 0, 3.4],
  air: [3.5, 0, 0.7],
  garden: [-4.1, 0, 2.1],
  workshop: [-3.5, 0, -3.1],
  radio: [0.4, 0, -3.6],
};
const labels: { text: string; point: Position }[] = [
  { text: "Habitat", point: [-2.7, 2.05, -0.5] },
  { text: "Garden", point: [-4.2, 1.45, 2.15] },
  { text: "Workshop", point: [-3.5, 2.35, -3.35] },
  { text: "Radio", point: [0.4, 3.8, -3.6] },
  { text: "Shelter", point: [3.7, 2.1, -1.9] },
];

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
          const gltf = await loader.parseAsync(
            await response.arrayBuffer(),
            BASE,
          );
          gltf.scene.traverse((object) => {
            if (!(object instanceof Mesh)) return;
            const pool = (material: Material) => {
              const key = material.name;
              if (sharedMaterials.has(key)) {
                const pooled = sharedMaterials.get(key)!;
                if (pooled !== material) material.dispose();
                return pooled;
              }
              if (
                material instanceof MeshStandardMaterial &&
                material.transparent
              )
                material.depthWrite = false;
              sharedMaterials.set(key, material);
              return material;
            };
            object.material = Array.isArray(object.material)
              ? object.material.map(pool)
              : pool(object.material);
            object.castShadow = false;
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
  position?: Position;
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

function mergedBoxes(
  boxes: { size: Position; at: Position; rotate?: number }[],
) {
  const parts = boxes.map(({ size, at, rotate = 0 }) =>
    new BoxGeometry(...size).rotateY(rotate).translate(...at),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function StaticIsland() {
  const paths = useMemo(
    () =>
      mergedBoxes([
        ...Array.from({ length: 8 }, (_, i) => ({
          size: [0.65, 0.045, 0.47] as Position,
          at: [-2.2 + i * 0.77, 0.025, -1.1] as Position,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          size: [0.5, 0.035, 0.5] as Position,
          at: [-2.6, 0.025, 0.6 + i * 0.72] as Position,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          size: [0.5, 0.035, 0.55] as Position,
          at: [-1.6 + i * 0.8, 0.025, -2.7] as Position,
        })),
      ]),
    [],
  );
  const shelterWalls = useMemo(
    () =>
      mergedBoxes([
        { size: [2.45, 0.22, 2.3], at: [3.7, 0.11, -1.95] },
        { size: [2.45, 1.45, 0.35], at: [3.7, 0.9, -2.95] },
        { size: [0.35, 1.45, 2], at: [4.75, 0.9, -1.95] },
        { size: [0.35, 1.45, 2], at: [2.65, 0.9, -1.95] },
      ]),
    [],
  );
  const shelterTrim = useMemo(
    () =>
      mergedBoxes([
        { size: [2.5, 0.15, 0.39], at: [3.7, 1.67, -2.95] },
        { size: [0.4, 0.15, 2.1], at: [4.75, 1.67, -1.95] },
        { size: [0.4, 0.15, 2.1], at: [2.65, 1.67, -1.95] },
        { size: [0.35, 0.5, 0.35], at: [3.1, 0.45, -0.9] },
        { size: [0.35, 0.5, 0.35], at: [4.3, 0.45, -0.9] },
      ]),
    [],
  );
  useEffect(
    () => () => {
      paths?.dispose();
      shelterWalls?.dispose();
      shelterTrim?.dispose();
    },
    [paths, shelterWalls, shelterTrim],
  );
  return (
    <>
      <mesh
        position={[0, -0.36, 0.25]}
        rotation={[0, 0.2, 0]}
        scale={[1.06, 1, 0.93]}
      >
        <cylinderGeometry args={[7.25, 6.9, 0.65, 10]} />
        <meshStandardMaterial color="#9c7e6e" flatShading roughness={1} />
      </mesh>
      <mesh
        position={[0, -0.045, 0.25]}
        rotation={[0, 0.2, 0]}
        scale={[1.06, 1, 0.93]}
      >
        <cylinderGeometry args={[7.25, 7.25, 0.07, 10]} />
        <meshStandardMaterial color="#e6cfb2" flatShading roughness={1} />
      </mesh>
      {paths && (
        <mesh geometry={paths}>
          <meshStandardMaterial color="#cbb095" roughness={1} />
        </mesh>
      )}
      {shelterWalls && (
        <mesh geometry={shelterWalls}>
          <meshStandardMaterial color="#e9d7bc" roughness={1} />
        </mesh>
      )}
      {shelterTrim && (
        <mesh geometry={shelterTrim}>
          <meshStandardMaterial color="#c67647" roughness={1} />
        </mesh>
      )}
      <mesh position={[3.7, 0.23, -1.95]}>
        <boxGeometry args={[1.6, 0.04, 1.6]} />
        <meshStandardMaterial color="#a9b6a0" roughness={1} />
      </mesh>
      <Model
        id="rocks"
        position={[-5.6, 0.1, -1.3]}
        scale={0.8}
        rotation={0.5}
      />
      <Model id="rocks" position={[4.5, 0.1, 4.3]} scale={0.65} rotation={2} />
      <Model id="rocks" position={[2.7, 0.1, -4.7]} scale={0.6} rotation={1} />
    </>
  );
}

function cellPoint(cell: number, y = 0.4): Position {
  return [
    BOARD[0] + (Math.floor(cell / 3) - 1) * 1.05,
    y,
    BOARD[2] + ((cell % 3) - 1) * 1.05,
  ];
}

function CargoBoard(props: Props) {
  const {
    state,
    draft,
    selected,
    focusedCell,
    vertical,
    onCell,
    onItem,
    interactive,
  } = props;
  const cells = occupied(state, draft);
  const ghost =
    selected && focusedCell !== null
      ? footprint(selected, { anchor: focusedCell, vertical })
      : [];
  const stripes = useMemo(
    () =>
      mergedBoxes(
        ROUTES.flatMap((route) => {
          const point = cellPoint(ROUTE_CELL[route], 0.398);
          return [-0.26, 0, 0.26].map((offset) => ({
            size: [0.08, 0.012, 0.8] as Position,
            at: [point[0] + offset, point[1], point[2]] as Position,
          }));
        }),
      ),
    [],
  );
  useEffect(() => () => stripes?.dispose(), [stripes]);
  return (
    <>
      <Model
        id="board"
        position={BOARD}
        onClick={() => props.onFacility("cargo")}
      />
      {stripes && (
        <mesh geometry={stripes}>
          <meshStandardMaterial color="#6eadae" roughness={1} />
        </mesh>
      )}
      {Array.from({ length: 9 }, (_, cell) => (
        <group key={cell} position={cellPoint(cell, 0.415)}>
          <mesh
            rotation-x={-Math.PI / 2}
            onClick={(event) => {
              if (!interactive) return;
              event.stopPropagation();
              onCell(cell);
            }}
          >
            <planeGeometry args={[1.02, 1.02]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          {(focusedCell === cell || ghost.includes(cell)) && interactive && (
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.38, 0.46, 4]} />
              <meshBasicMaterial
                color={
                  cells.has(cell) && cells.get(cell) !== selected
                    ? "#b65e40"
                    : "#e7a837"
                }
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      ))}
      {ITEMS_FOR_SCENE.map((item) => {
        if (
          item === "battery" &&
          (state.batteryUsed || (props.phase === "planning" && draft.battery))
        )
          return null;
        const placement =
          props.phase === "planning"
            ? draft.placements[item]
            : state.placements[item];
        let point: Position =
          item === "battery" ? [-1.35, 0.04, 4.45] : [-2.6, 0.04, 4.35];
        if (placement) {
          const occupiedCells = footprint(item, placement);
          const points = occupiedCells.map((cell) => cellPoint(cell));
          point = [
            points.reduce((sum, value) => sum + value[0], 0) / points.length,
            0.39,
            points.reduce((sum, value) => sum + value[2], 0) / points.length,
          ];
        }
        return (
          <Model
            key={item}
            id={item}
            position={point}
            rotation={
              placement ? (placement.vertical ? 0 : Math.PI / 2) : -0.15
            }
            scale={item === "research" ? 0.93 : 1}
            onClick={() => interactive && onItem(item)}
          />
        );
      })}
    </>
  );
}
const ITEMS_FOR_SCENE: Item[] = ["battery", "research"];

function MovingModels({
  destination,
  via,
  reducedMotion,
  paused,
  children,
}: {
  destination: Position;
  via?: Position[];
  reducedMotion: boolean;
  paused: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  const initialized = useRef(false);
  const travel = useRef<{
    points: Vector3[];
    lengths: number[];
    total: number;
    elapsed: number;
  } | null>(null);
  const { invalidate } = useThree();
  const target = useMemo(
    () => new Vector3(...destination),
    [destination[0], destination[1], destination[2]],
  );
  useLayoutEffect(() => {
    if (!initialized.current || reducedMotion) {
      ref.current?.position.copy(target);
      initialized.current = true;
      travel.current = null;
    } else if (ref.current) {
      const points = [
        ref.current.position.clone(),
        ...(via ?? []).map((point) => new Vector3(...point)),
        target,
      ];
      const lengths = points
        .slice(1)
        .map((point, index) => point.distanceTo(points[index]));
      travel.current = {
        points,
        lengths,
        total: lengths.reduce((sum, length) => sum + length, 0),
        elapsed: 0,
      };
    }
    invalidate();
  }, [target, via, reducedMotion, invalidate]);
  useEffect(() => {
    invalidate();
  }, [paused, invalidate]);
  useFrame((_, delta) => {
    if (paused || document.hidden || !ref.current) return;
    const motion = travel.current;
    if (motion) {
      motion.elapsed = Math.min(1.1, motion.elapsed + Math.min(delta, 0.05));
      let distance = (motion.total * motion.elapsed) / 1.1;
      for (let index = 0; index < motion.lengths.length; index++) {
        const length = motion.lengths[index];
        if (distance <= length || index === motion.lengths.length - 1) {
          ref.current.position.lerpVectors(
            motion.points[index],
            motion.points[index + 1],
            length ? Math.min(1, distance / length) : 1,
          );
          break;
        }
        distance -= length;
      }
      if (motion.elapsed >= 1.1) {
        ref.current.position.copy(target);
        travel.current = null;
      }
      invalidate();
    }
  });
  return <group ref={ref}>{children}</group>;
}

function BranchFan({ running, paused }: { running: boolean; paused: boolean }) {
  const object = useMemo(() => models.get("fan")!.clone(true), []);
  const rotor = useMemo(() => object.getObjectByName("Fan_Rotor"), [object]);
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [running, paused, invalidate]);
  useFrame((_, delta) => {
    if (running && !paused && !document.hidden && rotor) {
      rotor.rotation.z += Math.min(delta, 0.05) * 8;
      invalidate();
    }
  });
  return (
    <primitive
      object={object}
      position={[3.6, 0.03, 0.65]}
      scale={1.25}
      dispose={null}
    />
  );
}

function AirRoute({ props }: { props: Props }) {
  const route =
    props.phase === "planning" ? props.draft.route : props.state.activeRoute;
  const flow =
    props.phase === "planning"
      ? props.draft.devices.includes("fan") &&
        !!route &&
        routeStatus(props.state, props.draft, route) === "available"
      : props.state.branchReady;
  const geometry = useMemo(() => {
    if (!route) return null;
    const source = cellPoint(ROUTE_CELL[route], 0.16);
    return mergedBoxes([
      { size: [0.08, 0.1, 2.1], at: [source[0], 0.16, source[2] - 1.4] },
      {
        size: [Math.abs(3.6 - source[0]) + 0.05, 0.1, 0.08],
        at: [(source[0] + 3.6) / 2, 0.16, 0.65],
      },
      { size: [0.08, 0.1, 1.8], at: [3.6, 0.16, -0.3] },
    ]);
  }, [route]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={flow ? "#33a9a0" : "#b3a483"}
        emissive={flow ? "#195b54" : "#000000"}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function CameraRig({
  props,
  labelRefs,
}: {
  props: Props;
  labelRefs: React.RefObject<(HTMLSpanElement | null)[]>;
}) {
  const { camera, size, invalidate, gl, scene, setDpr } = useThree();
  useEffect(() => {
    const resume = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [invalidate]);
  useLayoutEffect(() => {
    const narrow = size.width < 761;
    const cameraOrtho = camera as OrthographicCamera & { manual: boolean };
    // Fiber must not replace our world-unit frustum with CSS-pixel extents
    // when DPR or the drawing buffer changes on retina/mobile screens.
    cameraOrtho.manual = true;
    const aspect = size.width / Math.max(1, size.height);
    const close =
      narrow &&
      !props.overview &&
      !props.menu &&
      props.phase === "planning" &&
      (props.state.shift === 3 || props.selected !== null);
    const width = narrow ? (close ? 10.7 : 16) : props.menu ? 22 : 19;
    const height = Math.max(narrow ? 8.5 : 11, width / aspect) / props.zoom;
    cameraOrtho.left = (-height * aspect) / 2;
    cameraOrtho.right = (height * aspect) / 2;
    cameraOrtho.top = height / 2;
    cameraOrtho.bottom = -height / 2;
    const target = new Vector3(
      narrow ? (close ? 0.8 : 0) : props.menu ? -2.2 : -0.4,
      0.3,
      narrow ? (close ? 2.2 : 0.5) : props.menu ? 2.2 : 1.1,
    );
    camera.position.copy(target).add(new Vector3(15, 18, 15));
    camera.lookAt(target);
    cameraOrtho.updateProjectionMatrix();
    const cap = props.lowGraphics ? 1 : narrow ? 1.25 : 1.5;
    setDpr(
      Math.min(
        devicePixelRatio,
        cap,
        Math.sqrt(2_000_000 / Math.max(1, size.width * size.height)),
      ),
    );
    invalidate();
  }, [
    camera,
    size.width,
    size.height,
    props.zoom,
    props.overview,
    props.menu,
    props.lowGraphics,
    props.phase,
    props.state.shift,
    props.selected,
    gl,
    invalidate,
    setDpr,
  ]);
  useEffect(() => {
    for (const material of sharedMaterials.values())
      if (
        material instanceof MeshStandardMaterial &&
        material.name === "M_Glass"
      ) {
        material.transparent = !props.lowGraphics;
        material.opacity = props.lowGraphics ? 1 : 0.35;
        material.depthWrite = props.lowGraphics;
        material.needsUpdate = true;
      }
    invalidate();
  }, [props.lowGraphics, invalidate]);
  useEffect(() => {
    let canceled = false;
    const warm = async () => {
      await gl.compileAsync(scene, camera);
      if (!canceled) {
        invalidate();
        requestAnimationFrame(() => {
          if (!canceled) props.onReady();
        });
      }
    };
    warm().catch(props.onError);
    return () => {
      canceled = true;
    };
  }, [gl, scene, camera]);
  const projected = useMemo(() => new Vector3(), []);
  useFrame(() => {
    labels.forEach((label, i) => {
      const element = labelRefs.current[i];
      if (!element) return;
      projected.set(...label.point).project(camera);
      const x = ((projected.x + 1) * size.width) / 2;
      const y = ((-projected.y + 1) * size.height) / 2;
      element.style.visibility =
        x < 35 || x > size.width - 35 || y < 24 || y > size.height - 10
          ? "hidden"
          : "visible";
      element.style.left = `${((projected.x + 1) * size.width) / 2}px`;
      element.style.top = `${((-projected.y + 1) * size.height) / 2}px`;
    });
    if (import.meta.env.DEV || location.search.includes("diagnostics")) {
      (
        window as unknown as { __moonshiftMetrics: unknown }
      ).__moonshiftMetrics = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length,
        width: gl.domElement.width,
        height: gl.domElement.height,
        frame: gl.info.render.frame,
        renderedAt: performance.now(),
      };
    }
  }, 1);
  // A positive-priority callback owns rendering. This also records complete
  // renderer counters after a frame, while demand mode remains idle otherwise.
  useFrame(() => {
    gl.render(scene, camera);
  }, 0.5);
  return null;
}

function World({
  props,
  labelRefs,
}: {
  props: Props;
  labelRefs: React.RefObject<(HTMLSpanElement | null)[]>;
}) {
  const crewPoint: Position =
    props.state.crewLocation === "shelter"
      ? [3.7, 0.25, -1.8]
      : [-2.55, 0.03, 0.55];
  const beepPoint: Position = props.menu
    ? [-0.8, 0.01, 3]
    : props.selected
      ? SPOTS.cargo
      : props.phase === "resolving"
        ? props.state.shift === 4
          ? SPOTS.air
          : props.state.shift === 5
            ? [-2.7, 0, -2]
            : SPOTS.cargo
        : SPOTS[props.activePanel];
  return (
    <>
      <color attach="background" args={["#7fc1f2"]} />
      <hemisphereLight args={["#c0d8ec", "#e6cfb2", 2.2]} />
      <directionalLight position={[2, 9, 6]} color="#ffe2b8" intensity={2.7} />
      <StaticIsland />
      <Model
        id="habitat"
        position={[-2.7, 0.02, -0.65]}
        rotation={0.15}
        onClick={() => props.onFacility("air")}
      />
      <Model
        id="garden"
        position={[-4.3, 0.02, 2.05]}
        rotation={0.15}
        onClick={() => props.onFacility("garden")}
      />
      <Model
        id="workshop"
        position={[-3.5, 0.02, -3.5]}
        rotation={0.15}
        onClick={() => props.onFacility("workshop")}
      />
      <Model
        id="radio"
        position={[0.4, 0.02, -3.6]}
        scale={0.9}
        onClick={() => props.onFacility("radio")}
      />
      <Model id="main-air" position={[-0.55, 0.02, -1.5]} scale={0.85} />
      <CargoBoard {...props} />
      <AirRoute props={props} />
      <BranchFan
        running={
          !props.reducedMotion &&
          props.phase === "resolving" &&
          props.draft.devices.includes("fan") &&
          props.state.branchReady
        }
        paused={props.paused}
      />
      <MovingModels
        destination={crewPoint}
        via={props.state.crewLocation === "shelter" ? TO_SHELTER : FROM_SHELTER}
        reducedMotion={props.reducedMotion}
        paused={props.paused}
      >
        <Model id="crew-a" position={[-0.5, 0, 0]} scale={0.5} rotation={0.2} />
        <Model
          id="crew-b"
          position={[0.1, 0, 0.25]}
          scale={0.5}
          rotation={-0.2}
        />
        <Model
          id="crew-c"
          position={[0.65, 0, -0.08]}
          scale={0.5}
          rotation={0.05}
        />
      </MovingModels>
      <MovingModels
        destination={beepPoint}
        reducedMotion={props.reducedMotion}
        paused={props.paused}
      >
        <Model id="beep" scale={0.47} rotation={0.35} />
      </MovingModels>
      {props.state.harvested && (
        <mesh position={[-4, 1.3, 2.05]}>
          <icosahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial
            color="#ffc857"
            emissive="#f4b23a"
            emissiveIntensity={0.25}
          />
        </mesh>
      )}
      <CameraRig props={props} labelRefs={labelRefs} />
    </>
  );
}

export default function Scene(props: Props) {
  const [loaded, setLoaded] = useState(models.size === manifest.models.length);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    consumers++;
    clearTimeout(cleanupTimer);
    let active = true;
    loadAssets((value) => {
      if (active) props.onProgress(value);
    })
      .then(() => {
        if (active) {
          props.onProgress(1);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) props.onError();
      });
    return () => {
      active = false;
      consumers--;
      cleanupTimer = setTimeout(() => {
        if (!consumers && !pending) disposeCache();
      }, 300);
    };
  }, []);
  if (!loaded) return null;
  return (
    <>
      <Canvas
        orthographic
        flat
        frameloop="demand"
        camera={{ position: [15, 18, 15], near: 0.1, far: 100, manual: true }}
        dpr={1}
        gl={{
          antialias: !props.lowGraphics,
          alpha: false,
          powerPreference: "default",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color("#7fc1f2"));
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            props.onError();
          });
        }}
        fallback={
          <div role="alert">This outpost needs a browser with WebGL 2.</div>
        }
      >
        <World props={props} labelRefs={labelRefs} />
      </Canvas>
      {!props.menu && (
        <div className="world-labels" aria-hidden="true">
          {labels.map((label, i) => (
            <span
              className="world-label"
              key={label.text}
              ref={(element) => {
                labelRefs.current[i] = element;
              }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
