"""MOONSHIFT new assets after real lunar base hardware.

- Solar tower: NASA's Vertical Solar Array Technology (VSAT) idea. At the lunar
  south pole the Sun skims the horizon, so the solar blanket stands vertical on a
  tall mast (10-20 m in NASA studies) on a small lander-style base.
- Landing pad: a flat, sintered regolith pad with markings. NASA plans landing
  zones away from the habitat so rocket exhaust does not blast dust onto it.
- Regolith berm: a low wall of piled regolith between the pad and the outpost,
  a barrier against that blast.

Run from the Moonshift folder: blender -b MOONSHIFT_assets.blend --python tools/new_real_hardware_assets.py
"""
import bpy, bmesh, math, os
from mathutils import Vector
M = bpy.data.materials

def new_coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
    root = bpy.data.objects.new(name + "_root", None); c.objects.link(root)
    return c, root
def obj(name, bm, mat, coll, parent, loc=(0, 0, 0), bevel=0.0):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(M[mat])
    for p in me.polygons: p.use_smooth = False
    o = bpy.data.objects.new(name, me); coll.objects.link(o); o.parent = parent; o.location = loc
    if bevel:
        m = o.modifiers.new("Bevel", "BEVEL"); m.width = bevel; m.segments = 1; m.limit_method = "ANGLE"
    return o
def box(name, size, loc, mat, coll, parent, bevel=0.02):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    return obj(name, bm, mat, coll, parent, loc, bevel)
def cyl(name, r, h, loc, mat, coll, parent, segs=10, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    return obj(name, bm, mat, coll, parent, loc)

# ---------------- Solar tower (VSAT)
c, root = new_coll("FAC_Solar_Tower")
box("SolarT_Base", (0.9, 0.9, 0.35), (0, 0, 0.32), "M_Cream", c, root)
box("SolarT_BaseBand", (0.94, 0.94, 0.08), (0, 0, 0.44), "M_Terracotta", c, root, 0)
for i, (x, y) in enumerate(((0.5, 0.5), (-0.5, 0.5), (0.5, -0.5), (-0.5, -0.5))):
    leg = cyl(f"SolarT_Leg{i}", 0.04, 0.42, (x * 0.85, y * 0.85, 0.2), "M_Steel", c, root, 6)
    leg.rotation_euler = (-y * 0.5, x * 0.5, 0)
    cyl(f"SolarT_Foot{i}", 0.1, 0.04, (x * 1.0, y * 1.0, 0.02), "M_DarkGrey", c, root, 8)
cyl("SolarT_Mast", 0.07, 3.4, (0, 0, 0.5 + 1.7), "M_Steel", c, root, 8)
cyl("SolarT_MastCollar", 0.12, 0.12, (0, 0, 1.0), "M_Terracotta", c, root, 8)
# Vertical blanket: two wings either side of the mast, made of cells.
for side in (-1, 1):
    box(f"SolarT_Frame{side}", (0.86, 0.05, 2.1), (side * 0.5, 0, 2.75), "M_Steel", c, root, 0)
    box(f"SolarT_Panel{side}", (0.8, 0.06, 2.02), (side * 0.5, 0, 2.75), "M_ScreenNavy", c, root, 0)
    for k in range(1, 5):
        box(f"SolarT_Cell{side}_{k}", (0.8, 0.065, 0.025), (side * 0.5, 0, 1.74 + k * 0.404), "M_Steel", c, root, 0)
box("SolarT_TopBar", (1.9, 0.08, 0.06), (0, 0, 3.83), "M_Steel", c, root, 0)
cyl("SolarT_Beacon", 0.07, 0.1, (0, 0, 3.95), "M_GlowAmber", c, root, 8)

# ---------------- Landing pad
c, root = new_coll("ENV_Landing_Pad")
cyl("Pad_Disc", 2.3, 0.08, (0, 0, 0.04), "M_Floor", c, root, 24)
cyl("Pad_Ring", 1.95, 0.085, (0, 0, 0.045), "M_DarkGrey", c, root, 24)
cyl("Pad_Inner", 1.8, 0.09, (0, 0, 0.05), "M_Floor", c, root, 24)
for i in range(8):
    a = math.pi * 2 * i / 8
    o = box(f"Pad_Mark{i}", (0.42, 0.12, 0.02), (1.88 * math.cos(a), 1.88 * math.sin(a), 0.1), "M_Mustard", c, root, 0)
    o.rotation_euler = (0, 0, a + math.pi / 2)
box("Pad_CrossA", (1.6, 0.16, 0.02), (0, 0, 0.1), "M_Terracotta", c, root, 0)
box("Pad_CrossB", (0.16, 1.6, 0.02), (0, 0, 0.1), "M_Terracotta", c, root, 0)

# ---------------- Regolith berm (curved low wall)
c, root = new_coll("ENV_Regolith_Berm")
bm = bmesh.new()
segs, R, arc = 10, 4.0, math.radians(70)
prof = [(-0.55, 0.0), (-0.25, 0.55), (0.25, 0.55), (0.55, 0.0)]  # (radial offset, height)
rings = []
for i in range(segs + 1):
    a = -arc / 2 + arc * i / segs
    d = Vector((math.cos(a), math.sin(a), 0))
    rings.append([bm.verts.new(d * (R + o) + Vector((0, 0, h * (1 - 0.15 * ((i % 3) == 1))))) for o, h in prof])
for i in range(segs):
    for k in range(len(prof) - 1):
        bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k + 1], rings[i][k + 1]))
bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
berm = obj("Berm_Mound", bm, "M_Regolith", c, root)
berm.location = (-R, 0, 0)  # arc centred on the root, bulging toward +X

def export(coll_name, path):
    coll = bpy.data.collections[coll_name]
    objs = [o for o in coll.all_objects if not o.name.endswith("_DisplayTile")]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_yup=True, export_format="GLB")
base = os.path.join(os.path.dirname(bpy.data.filepath), "exports") + "/"
export("FAC_Solar_Tower", base + "04_Facilities/MOONSHIFT_FAC_Solar_Tower.glb")
export("ENV_Landing_Pad", base + "05_Opening_Environment/MOONSHIFT_ENV_Landing_Pad.glb")
export("ENV_Regolith_Berm", base + "05_Opening_Environment/MOONSHIFT_ENV_Regolith_Berm.glb")
print("DONE3")
