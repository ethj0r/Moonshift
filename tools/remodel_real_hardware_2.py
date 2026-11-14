"""MOONSHIFT models, part 2: radio and garden closer to real lunar hardware.

- Radio: the Earth-style lattice tower becomes a dish antenna on a tripod, like the
  Apollo S-band erectable antenna. At the lunar south pole Earth sits low on the
  horizon, so the dish points almost sideways. The equipment hut stays.
- Garden: the open glass tunnel gets glass end walls and an airlock door, so it is a
  sealed, pressurised greenhouse (plants need air pressure on the Moon).

Run from the Moonshift folder (does not modify MOONSHIFT_assets.blend):
  blender -b MOONSHIFT_assets.blend --python tools/remodel_real_hardware.py --python tools/remodel_real_hardware_2.py
Then: cd prototype && npm run prepare:assets
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
M = bpy.data.materials

def mesh_obj(name, bm, mat, parent, coll, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(M[mat])
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); ob.parent = parent; ob.location = loc
    return ob
def strut(name, a, b, w, mat, parent, coll):
    a, b = Vector(a), Vector(b); d = b - a
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * w, v.co.z * d.length))
    ob = mesh_obj(name, bm, mat, parent, coll, (a + b) / 2)
    ob.rotation_mode = "QUATERNION"; ob.rotation_quaternion = d.to_track_quat("Z", "Y")
    return ob

# ---------------- Radio
coll = bpy.data.collections["FAC_Radio_Station"]; root = bpy.data.objects["Radio_Station_root"]
for o in list(coll.all_objects):
    if o.name.startswith(("RadioSt_Leg", "RadioSt_Brace", "RadioSt_TopMast")):
        bpy.data.objects.remove(o, do_unlink=True)
apex = Vector((-0.15, -0.15, 1.45))
for i in range(3):
    ang = math.radians(90 + 120 * i)
    foot = Vector((-0.15 + 0.55 * math.cos(ang), -0.15 + 0.55 * math.sin(ang), 0.12))
    strut(f"RadioSt_TripodLeg{i}", foot, apex, 0.05, "M_Steel", root, coll)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * 0.14, v.co.y * 0.14, v.co.z * 0.04))
    mesh_obj(f"RadioSt_TripodFoot{i}", bm, "M_Terracotta", root, coll, foot + Vector((0, 0, 0.0)))
strut("RadioSt_Mount", apex - Vector((0, 0, 0.1)), apex + Vector((0, 0, 0.22)), 0.08, "M_DarkGrey", root, coll)
pivot = bpy.data.objects["RadioSt_DishPivot"]
pivot.location = apex + Vector((0, 0, 0.3))
aim = Vector((0.0, -math.cos(math.radians(12)), math.sin(math.radians(12))))  # toward Earth, 12 deg above the horizon
pivot.rotation_mode = "QUATERNION"; pivot.rotation_quaternion = (-aim).to_track_quat("Z", "Y")
pivot.scale = (1.4, 1.4, 1.0)
# Umbrella ribs on the dish rim, like the Apollo antenna's mesh umbrella.
dish = bpy.data.objects["RadioSt_Dish"]
for i in range(8):
    a = 2 * math.pi * i / 8
    strut(f"RadioSt_Rib{i}", (0, 0, -0.02), (0.47 * math.cos(a), 0.47 * math.sin(a), -0.40), 0.022, "M_Steel", pivot, coll)
# Beacon moves to a short mast on the hut.
beacon = bpy.data.objects["RadioSt_Beacon"]; beacon.location = (0.75, 0.75, 1.48)
bpy.data.objects["RadioSt_Whip"].location = (0.75, 0.75, 1.10)

# ---------------- Garden
coll = bpy.data.collections["FAC_Garden_Facility"]; root = bpy.data.objects["Garden_Facility_root"]
def half_disc(name, x, r, zc, mat, segs=12):
    bm = bmesh.new()
    vs = [bm.verts.new((x, r * math.cos(math.pi * i / segs), zc + r * math.sin(math.pi * i / segs))) for i in range(segs + 1)]
    bm.faces.new(vs); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.02)
    return mesh_obj(name, bm, mat, root, coll)
for side, x in (("W", -0.95), ("E", 0.95)):
    half_disc(f"Garden_EndWall{side}", x, 0.96, 0.12, "M_Glass")
# Airlock door on the east end.
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * 0.08, v.co.y * 0.42, v.co.z * 0.62))
mesh_obj("Garden_AirlockDoor", bm, "M_DustyBlue", root, coll, (0.99, 0.0, 0.43))
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * 0.1, v.co.y * 0.5, v.co.z * 0.06))
mesh_obj("Garden_AirlockFrame", bm, "M_Terracotta", root, coll, (1.0, 0.0, 0.77))

def export(coll_name, path):
    coll = bpy.data.collections[coll_name]
    objs = [o for o in coll.all_objects if not o.name.endswith("_DisplayTile") and not o.name.startswith("Tile_")]
    roots = [o for o in objs if o.parent is None]
    saved = {o: o.location.copy() for o in roots}
    for o in roots: o.location.x -= saved[roots[0]].x; o.location.y -= saved[roots[0]].y
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_yup=True, export_format="GLB")
    for o, l in saved.items(): o.location = l
base = os.path.join(os.path.dirname(bpy.data.filepath), "exports") + "/"
export("FAC_Radio_Station", base + "04_Facilities/MOONSHIFT_FAC_Radio_Station.glb")
export("FAC_Garden_Facility", base + "04_Facilities/MOONSHIFT_FAC_Garden_Facility.glb")
print("DONE2")
