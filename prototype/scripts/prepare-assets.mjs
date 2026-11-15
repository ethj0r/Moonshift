import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This intentionally handles the repository's texture-free, unskinned GLBs only.
// It bakes node transforms, keeps flat normals, and groups static primitives by
// material without adding an asset-processing dependency to the prototype.
const prototype = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(prototype, "..");
const output = resolve(prototype, "public/assets/models");
const models = [
  ["beep", "01_Characters/MOONSHIFT_CHR_BEEP_Robot.glb", "normalize-yaw"],
  ["crew-a", "01_Characters/MOONSHIFT_CHR_Crew_A.glb"],
  ["crew-b", "01_Characters/MOONSHIFT_CHR_Crew_B.glb"],
  ["crew-c", "01_Characters/MOONSHIFT_CHR_Crew_C.glb"],
  ["fan", "03_AirSystem/MOONSHIFT_AIR_Fan_Branch.glb", "rotor"],
  ["main-air", "03_AirSystem/MOONSHIFT_AIR_Main_Air_Unit.glb"],
  ["battery", "02_Items/MOONSHIFT_ITM_Battery_Portable.glb"],
  [
    "research",
    "02_Items/MOONSHIFT_ITM_Crate_Research_Large_2Tile.glb",
    "normalize-yaw",
  ],
  ["habitat", "04_Facilities/MOONSHIFT_FAC_Habitat_Module.glb", "habitat"],
  ["garden", "04_Facilities/MOONSHIFT_FAC_Garden_Facility.glb"],
  ["workshop", "04_Facilities/MOONSHIFT_FAC_Workshop_Intact.glb"],
  ["radio", "04_Facilities/MOONSHIFT_FAC_Radio_Station.glb"],
  ["rocks", "05_Opening_Environment/MOONSHIFT_ENV_Terrain_Rocks.glb"],
  ["food", "02_Items/MOONSHIFT_ITM_Food_Pack.glb", "normalize-yaw"],
  ["kit", "02_Items/MOONSHIFT_ITM_Garden_Kit.glb", "normalize-yaw"],
  ["supply", "02_Items/MOONSHIFT_ITM_Crate_Small_1Tile.glb", "normalize-yaw"],
  ["spare", "02_Items/MOONSHIFT_ITM_Air_Component.glb", "normalize-yaw"],
  ["workshop-dismantled", "04_Facilities/MOONSHIFT_FAC_Workshop_Dismantled.glb"],
  ["lander", "05_Opening_Environment/MOONSHIFT_ENV_Cargo_Lander_Damaged.glb"],
  ["solar-tower", "04_Facilities/MOONSHIFT_FAC_Solar_Tower.glb"],
  ["landing-pad", "05_Opening_Environment/MOONSHIFT_ENV_Landing_Pad.glb"],
  ["berm", "05_Opening_Environment/MOONSHIFT_ENV_Regolith_Berm.glb"],
  ["crater", "05_Opening_Environment/MOONSHIFT_ENV_Terrain_Crater.glb"],
  ["path-light", "05_Opening_Environment/MOONSHIFT_ENV_Terrain_PathLight.glb"],
];
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const multiply = (a, b) =>
  Array.from({ length: 16 }, (_, i) => {
    const row = i % 4,
      col = Math.floor(i / 4);
    return (
      a[row] * b[col * 4] +
      a[row + 4] * b[col * 4 + 1] +
      a[row + 8] * b[col * 4 + 2] +
      a[row + 12] * b[col * 4 + 3]
    );
  });
function matrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx,
    (2 * x * y + 2 * z * w) * sx,
    (2 * x * z - 2 * y * w) * sx,
    0,
    (2 * x * y - 2 * z * w) * sy,
    (1 - 2 * x * x - 2 * z * z) * sy,
    (2 * y * z + 2 * x * w) * sy,
    0,
    (2 * x * z + 2 * y * w) * sz,
    (2 * y * z - 2 * x * w) * sz,
    (1 - 2 * x * x - 2 * y * y) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}
const point = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
function normal(m, [x, y, z]) {
  // Cofactor matrix is inverse-transpose up to a scalar. Normalization removes
  // that scalar; retain determinant sign for the general affine case.
  const a = m[0],
    b = m[4],
    c = m[8],
    d = m[1],
    e = m[5],
    f = m[9],
    g = m[2],
    h = m[6],
    i = m[10];
  const determinant =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(determinant) < 1e-12) throw new Error("Singular mesh transform");
  const transformed = [
    ((e * i - f * h) * x + (f * g - d * i) * y + (d * h - e * g) * z) /
      determinant,
    ((c * h - b * i) * x + (a * i - c * g) * y + (b * g - a * h) * z) /
      determinant,
    ((b * f - c * e) * x + (c * d - a * f) * y + (a * e - b * d) * z) /
      determinant,
  ];
  const length = Math.hypot(...transformed);
  return transformed.map((value) => value / length);
}
function decodeGlb(bytes) {
  if (
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw new Error("Invalid GLB header");
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset),
      type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString());
    if (type === 0x004e4942) binary = chunk;
    offset += length + 8;
  }
  if (!json || !binary) throw new Error("Missing GLB chunks");
  if (json.images?.length || json.animations?.length || json.skins?.length)
    throw new Error("Only static texture-free assets are supported");
  return { json, binary };
}
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const componentTypes = {
  5121: [1, "readUInt8"],
  5123: [2, "readUInt16LE"],
  5125: [4, "readUInt32LE"],
  5126: [4, "readFloatLE"],
};
function readAccessor(json, binary, index) {
  const accessor = json.accessors[index],
    view = json.bufferViews[accessor.bufferView];
  if (accessor.sparse || accessor.normalized || view.buffer !== 0)
    throw new Error("Unsupported accessor");
  const [bytes, reader] = componentTypes[accessor.componentType] ?? [];
  const width = components[accessor.type];
  if (!bytes || !width) throw new Error("Unsupported component type");
  const stride = view.byteStride ?? bytes * width;
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return Array.from({ length: accessor.count }, (_, row) =>
    Array.from({ length: width }, (_, col) =>
      binary[reader](offset + row * stride + col * bytes),
    ),
  );
}
function statistics(json) {
  let primitives = 0,
    triangles = 0;
  for (const mesh of json.meshes ?? [])
    for (const primitive of mesh.primitives) {
      primitives++;
      if ((primitive.mode ?? 4) !== 4)
        throw new Error("Only triangles are supported");
      triangles +=
        json.accessors[primitive.indices ?? primitive.attributes.POSITION]
          .count / 3;
    }
  return { primitives, triangles };
}
function prepare(bytes, id, mode) {
  const { json: source, binary } = decodeGlb(bytes);
  const rootIds = source.scenes[source.scene ?? 0].nodes;
  const changes = [
    "Bake mesh transforms and merge static geometry by material; retain status meshes",
  ];
  if (mode === "normalize-yaw") {
    for (const rootId of rootIds) source.nodes[rootId].rotation = [0, 0, 0, 1];
    changes.push(
      "Remove known showcase root yaw; retain Y-up and +Z asset front",
    );
  }
  if (mode === "board")
    changes.push(
      "Remove VentZone_*, ServiceZone_*, and CrewZone_* geometry; keep tiles and route markers",
    );
  if (mode === "habitat")
    changes.push(
      "Remove attached Garden and Radio groups; standalone facilities are used instead",
    );
  if (mode === "rotor")
    changes.push("Keep blade geometry in Fan_Rotor group around the hub pivot");
  const buckets = new Map();
  let rotorPivot = [0, 0, 0];
  let visibleTriangles = 0;
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  const removedNodes = [];
  const skip = (node) =>
    (mode === "board" &&
      /^(VentZone_|ServiceZone_|CrewZone_)/.test(node.name ?? "")) ||
    (mode === "habitat" && ["Garden", "Radio"].includes(node.name));
  function walk(index, parent) {
    const node = source.nodes[index];
    if (skip(node)) {
      removedNodes.push(node.name);
      return;
    }
    const world = multiply(parent, matrix(node));
    if (mode === "rotor" && node.name === "FanB_Hub")
      rotorPivot = point(world, [0, 0, 0]);
    if (node.mesh !== undefined) {
      const rotor = mode === "rotor" && /^FanB_Blade/.test(node.name);
      const separate =
        rotor ||
        /Light|Glow|Eye|AntennaBulb|Beacon|Lamp|Status/.test(node.name ?? "");
      for (const primitive of source.meshes[node.mesh].primitives) {
        if (
          Object.keys(primitive.attributes).some(
            (key) => !["POSITION", "NORMAL"].includes(key),
          )
        )
          throw new Error("Unexpected vertex attribute");
        const key = rotor
          ? `rotor:${primitive.material}`
          : separate
            ? `part:${node.name}:${primitive.material}`
            : `static:${primitive.material}`;
        if (!buckets.has(key))
          buckets.set(key, {
            name: rotor
              ? "Fan_Rotor_Blades"
              : separate
                ? node.name
                : `${id}_material_${primitive.material}`,
            material: primitive.material,
            rotor,
            positions: [],
            normals: [],
            indices: [],
          });
        const target = buckets.get(key),
          start = target.positions.length / 3;
        const positions = readAccessor(
          source,
          binary,
          primitive.attributes.POSITION,
        );
        const normals = readAccessor(
          source,
          binary,
          primitive.attributes.NORMAL,
        );
        for (let i = 0; i < positions.length; i++) {
          const position = point(world, positions[i]);
          for (let axis = 0; axis < 3; axis++) {
            bounds.min[axis] = Math.min(bounds.min[axis], position[axis]);
            bounds.max[axis] = Math.max(bounds.max[axis], position[axis]);
          }
          target.positions.push(...position);
          target.normals.push(...normal(world, normals[i]));
        }
        const indices =
          primitive.indices === undefined
            ? positions.map((_, index) => index)
            : readAccessor(source, binary, primitive.indices).flat();
        target.indices.push(...indices.map((index) => index + start));
        visibleTriangles += indices.length / 3;
      }
    }
    for (const child of node.children ?? []) walk(child, world);
  }
  for (const root of rootIds) walk(root, identity());
  const document = {
    asset: {
      version: "2.0",
      generator: "MOONSHIFT prototype asset preparation",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: `${id}_root`, children: [] }],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    materials: source.materials,
    ...(source.extensionsUsed ? { extensionsUsed: source.extensionsUsed } : {}),
  };
  const chunks = [];
  let byteOffset = 0;
  function accessor(values, type, componentType) {
    const width = components[type],
      useFloat = componentType === 5126;
    const data = Buffer.alloc(values.length * (componentType === 5123 ? 2 : 4));
    for (let i = 0; i < values.length; i++) {
      if (!Number.isFinite(values[i]))
        throw new Error("Non-finite vertex value");
      if (useFloat) data.writeFloatLE(values[i], i * 4);
      else if (componentType === 5123) data.writeUInt16LE(values[i], i * 2);
      else data.writeUInt32LE(values[i], i * 4);
    }
    const view = document.bufferViews.length;
    document.bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: data.length,
      target: type === "SCALAR" ? 34963 : 34962,
    });
    chunks.push(data);
    byteOffset += data.length;
    if (byteOffset % 4) {
      const pad = Buffer.alloc(4 - (byteOffset % 4));
      chunks.push(pad);
      byteOffset += pad.length;
    }
    const entry = {
      bufferView: view,
      componentType,
      count: values.length / width,
      type,
    };
    if (type === "VEC3") {
      entry.min = Array.from({ length: 3 }, (_, axis) =>
        values
          .filter((_, i) => i % 3 === axis)
          .reduce((a, b) => Math.min(a, b), Infinity),
      );
      entry.max = Array.from({ length: 3 }, (_, axis) =>
        values
          .filter((_, i) => i % 3 === axis)
          .reduce((a, b) => Math.max(a, b), -Infinity),
      );
    }
    document.accessors.push(entry);
    return document.accessors.length - 1;
  }
  let rotorNode;
  if (mode === "rotor") {
    rotorNode = document.nodes.length;
    document.nodes.push({
      name: "Fan_Rotor",
      translation: rotorPivot,
      children: [],
    });
    document.nodes[0].children.push(rotorNode);
  }
  for (const bucket of buckets.values()) {
    if (bucket.rotor)
      for (let index = 0; index < bucket.positions.length; index++)
        bucket.positions[index] -= rotorPivot[index % 3];
    const position = accessor(bucket.positions, "VEC3", 5126);
    const normal = accessor(bucket.normals, "VEC3", 5126);
    const index = accessor(
      bucket.indices,
      "SCALAR",
      bucket.positions.length / 3 <= 65535 ? 5123 : 5125,
    );
    const mesh = document.meshes.length;
    document.meshes.push({
      name: bucket.name,
      primitives: [
        {
          attributes: { POSITION: position, NORMAL: normal },
          indices: index,
          material: bucket.material,
        },
      ],
    });
    const node = document.nodes.length;
    document.nodes.push({ name: bucket.name, mesh });
    document.nodes[bucket.rotor ? rotorNode : 0].children.push(node);
  }
  document.buffers.push({ byteLength: byteOffset });
  const json = Buffer.from(JSON.stringify(document));
  const jsonPadding = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
  const jsonLength = json.length + jsonPadding.length;
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonLength + 8 + byteOffset, 8);
  header.writeUInt32LE(jsonLength, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(byteOffset, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const prepared = Buffer.concat([
    header,
    json,
    jsonPadding,
    binHeader,
    ...chunks,
  ]);
  const validated = decodeGlb(prepared);
  const preparedStats = statistics(validated.json);
  if (preparedStats.triangles !== visibleTriangles)
    throw new Error("Triangle conservation failed");
  return { prepared, changes, removedNodes, bounds, preparedStats };
}

await mkdir(output, { recursive: true });
const manifest = {
  format: 1,
  generatedBy: "scripts/prepare-assets.mjs",
  models: [],
  totals: {
    sourceBytes: 0,
    preparedBytes: 0,
    sourcePrimitives: 0,
    preparedPrimitives: 0,
    sourceTriangles: 0,
    preparedTriangles: 0,
  },
};
for (const [id, path, mode] of models) {
  const bytes = await readFile(resolve(repository, "exports", path));
  const sourceStats = statistics(decodeGlb(bytes).json);
  const result = prepare(bytes, id, mode);
  await writeFile(resolve(output, `${id}.glb`), result.prepared);
  const record = {
    id,
    source: `../exports/${path}`,
    url: `assets/models/${id}.glb`,
    sourceBytes: bytes.length,
    preparedBytes: result.prepared.length,
    sourcePrimitives: sourceStats.primitives,
    preparedPrimitives: result.preparedStats.primitives,
    sourceTriangles: sourceStats.triangles,
    preparedTriangles: result.preparedStats.triangles,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    preparedSha256: createHash("sha256").update(result.prepared).digest("hex"),
    bounds: result.bounds,
    changes: result.changes,
    ...(result.removedNodes.length
      ? { removedNodes: result.removedNodes }
      : {}),
  };
  manifest.models.push(record);
  for (const key of Object.keys(manifest.totals))
    manifest.totals[key] += record[key];
}
await copyFile(
  resolve(repository, "LICENSE"),
  resolve(prototype, "public/assets/LICENSE"),
);
await writeFile(
  resolve(prototype, "asset-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Prepared ${manifest.models.length} models: ${manifest.totals.preparedBytes.toLocaleString()} bytes, ${manifest.totals.preparedPrimitives} primitives, ${manifest.totals.preparedTriangles} triangles.`,
);
