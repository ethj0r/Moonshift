// A glowing face on the crew's dark helmet visor, like a status display, so the
// astronauts can smile, worry or look tired. Drawn once per expression on a canvas
// and laid on a curved strip that hugs the visor.
import { CanvasTexture, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, SRGBColorSpace } from "three";

export type Expression = "happy" | "calm" | "worried" | "tired";

/** The crew models face 0.5 rad off +z; the visor sits on the front of the helmet. */
export const CREW_FACING = 0.5;
const HEAD_Y = 1.63;

const textures = new Map<Expression, CanvasTexture>();

function draw(expr: Expression) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const glow = expr === "worried" ? "#ffd2a8" : "#bff8ee";
  g.strokeStyle = glow;
  g.fillStyle = glow;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = expr === "worried" ? "#ff8a3d" : "#41e0c8";
  g.shadowBlur = 14;
  g.lineWidth = 15;
  const L = 82;
  const R = 174;
  const Y = 56;
  const eye = (x: number) => {
    if (expr === "happy") {
      g.beginPath();
      g.arc(x, Y + 10, 21, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else if (expr === "tired") {
      g.beginPath();
      g.moveTo(x - 16, Y + 4);
      g.quadraticCurveTo(x, Y + 13, x + 16, Y + 4);
      g.stroke();
    } else {
      g.beginPath();
      g.ellipse(x, Y, 13, expr === "worried" ? 19 : 17, 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  eye(L);
  eye(R);
  g.lineWidth = 12;
  g.beginPath();
  if (expr === "happy") {
    g.moveTo(104, 92);
    g.quadraticCurveTo(128, 116, 152, 92);
  } else if (expr === "calm") {
    g.moveTo(110, 96);
    g.quadraticCurveTo(128, 104, 146, 96);
  } else if (expr === "worried") {
    g.moveTo(108, 104);
    g.quadraticCurveTo(128, 88, 148, 104);
    // brows tilted up in the middle
    g.moveTo(L - 18, Y - 26);
    g.lineTo(L + 12, Y - 34);
    g.moveTo(R + 18, Y - 26);
    g.lineTo(R - 12, Y - 34);
  } else {
    g.moveTo(114, 100);
    g.bezierCurveTo(122, 94, 128, 106, 134, 100);
    g.bezierCurveTo(138, 96, 142, 98, 144, 100);
  }
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function faceTexture(expr: Expression) {
  if (!textures.has(expr)) textures.set(expr, draw(expr));
  return textures.get(expr)!;
}

/** A face to add as a child of a crew model (model space, before the model's own scale). */
export function makeFace(expr: Expression): Group {
  const group = new Group();
  group.name = "visor-face";
  // A slice of a cylinder around the head, so the face curves with the visor instead of floating flat.
  const radius = 0.5;
  const arc = 1.05;
  const geo = new CylinderGeometry(radius, radius, 0.36, 24, 1, true, -arc / 2, arc);
  const mat = new MeshBasicMaterial({ map: faceTexture(expr), transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 2;
  group.add(mesh);
  group.position.set(0.035, HEAD_Y, 0.03);
  group.rotation.y = CREW_FACING;
  return group;
}
