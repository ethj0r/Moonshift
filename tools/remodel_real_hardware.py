"""Make three MOONSHIFT models closer to real lunar hardware, then re-export their GLBs.

- Crew A/B/C: white suits (real lunar suits are white) with role-colour arm and leg
  stripes, like the commander stripes on Apollo suits. Role colours stay readable.
- Workshop: the Earth-style house (gable roof, chimney, wooden bench) becomes a
  regolith-covered vault module with a metal bench. Lunar base concepts pile regolith
  on modules for radiation shielding, the same idea as the game's shelter wall.
- Dismantled workshop: fallen roof panels use the regolith material to match.

Run from the Moonshift folder (does not modify MOONSHIFT_assets.blend):
  blender -b MOONSHIFT_assets.blend --python tools/remodel_real_hardware.py
Then: cd prototype && npm run prepare:assets
"""
import bpy, bmesh, math, os
from mathutils import Vector
M = bpy.data.materials
def link(obj, coll): coll.objects.link(obj)

# ---------- Crew: white suits (like real lunar suits) with role-colour stripes (like Apollo commander stripes)
white = list(M["M_Suit_CrewA"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value)
accent = {"A": "M_Terracotta", "B": "M_DustyBlue", "C": "M_Purple"}
def box(name, size, loc, rot, mat, parent, coll):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x*size[0], v.co.y*size[1], v.co.z*size[2]))
    bm.to_mesh(me); bm.free(); me.materials.append(M[mat])
    ob = bpy.data.objects.new(name, me); link(ob, coll)
    ob.parent = parent; ob.location = loc; ob.rotation_euler = rot
    return ob
for k in "ABC":
    coll = bpy.data.collections[f"CHR_Crew_{k}"]
    M[f"M_Suit_Crew{k}"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = white
    root = bpy.data.objects[f"Crew{k}_root"]
    for side in "LR":
        arm = bpy.data.objects[f"Crew{k}_Arm_{side}"]
        a = arm.location.copy(); a.z += 0.06
        box(f"Crew{k}_ArmStripe_{side}", (0.112, 0.132, 0.04), a, arm.rotation_euler.copy(), accent[k], root, coll)
        leg = bpy.data.objects[f"Crew{k}_Leg_{side}"]
        l = leg.location.copy(); l.z += 0.05
        box(f"Crew{k}_LegStripe_{side}", (0.142, 0.172, 0.04), l, leg.rotation_euler.copy(), accent[k], root, coll)

# ---------- Workshop: regolith-covered vault module instead of an Earth house
coll = bpy.data.collections["FAC_Workshop_Intact"]
root = bpy.data.objects["Workshop_Intact_root"]
for n in ("Workshop_Intact_Roof", "Workshop_Intact_RoofRidge", "Workshop_Intact_Chimney", "Workshop_Intact_ChimneyCap"):
    bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
def vault(name, length, radius, center, mat, segs=8, thickness=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    def ring(x, r):
        return [bm.verts.new((x, r*math.cos(math.pi*i/segs), r*math.sin(math.pi*i/segs))) for i in range(segs+1)]
    if thickness is None:
        a, b = ring(-length/2, radius), ring(length/2, radius)
        for i in range(segs): bm.faces.new((a[i], a[i+1], b[i+1], b[i]))
        bm.faces.new(a[::-1]); bm.faces.new(b)
    else:  # thin arch band (rib)
        ao, bo = ring(-length/2, radius+thickness), ring(length/2, radius+thickness)
        ai, bi = ring(-length/2, radius), ring(length/2, radius)
        for i in range(segs):
            bm.faces.new((ao[i], ao[i+1], bo[i+1], bo[i])); bm.faces.new((ai[i+1], ai[i], bi[i], bi[i+1]))
            bm.faces.new((ao[i+1], ao[i], ai[i], ai[i+1])); bm.faces.new((bo[i], bo[i+1], bi[i+1], bi[i]))
        for (o, n_) in ((ao, ai), (bo, bi)):
            pass
        bm.faces.new((ao[0], bo[0], bi[0], ai[0])); bm.faces.new((ao[-1], ai[-1], bi[-1], bo[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.materials.append(M[mat])
    ob = bpy.data.objects.new(name, me); link(ob, coll); ob.parent = root; ob.location = center
    return ob
body = bpy.data.objects["Workshop_Intact_Body"]
top = body.location.z + body.dimensions.z/2           # 1.12
vault("Workshop_Intact_Vault", 1.80, 0.64, Vector((0, body.location.y, top - 0.02)), "M_Regolith")
for i, x in enumerate((-0.9, 0.0, 0.9)):
    vault(f"Workshop_Intact_Rib{i}", 0.08, 0.64, Vector((x, body.location.y, top - 0.02)), "M_Terracotta", thickness=0.04)
for n, m in (("Workshop_Intact_BenchTop", "M_Steel"),) + tuple((f"Workshop_Intact_BenchLeg{i}", "M_DarkGrey") for i in range(4)):
    bpy.data.objects[n].data.materials[0] = M[m]
# Dismantled: fallen roof panels are now regolith-covered vault panels.
for n in ("Workshop_Dismantled_RoofPanelA", "Workshop_Dismantled_RoofPanelB"):
    bpy.data.objects[n].data.materials[0] = M["M_Regolith"]

# ---------- export
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
export("CHR_Crew_A", base + "01_Characters/MOONSHIFT_CHR_Crew_A.glb")
export("CHR_Crew_B", base + "01_Characters/MOONSHIFT_CHR_Crew_B.glb")
export("CHR_Crew_C", base + "01_Characters/MOONSHIFT_CHR_Crew_C.glb")
export("FAC_Workshop_Intact", base + "04_Facilities/MOONSHIFT_FAC_Workshop_Intact.glb")
export("FAC_Workshop_Dismantled", base + "04_Facilities/MOONSHIFT_FAC_Workshop_Dismantled.glb")
print("DONE")
