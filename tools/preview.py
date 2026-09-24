"""Render quick turnaround previews of a .blend or .glb with Cycles (CPU)."""
import sys, math, os
import bpy
from mathutils import Vector

src, out = sys.argv[1], sys.argv[2]
angles = [float(a) for a in (sys.argv[3] if len(sys.argv) > 3 else '0,90,180').split(',')]
focus = sys.argv[4] if len(sys.argv) > 4 else 'body'

if src.endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)

scene = bpy.context.scene
for o in list(scene.objects):
    if o.type == 'ARMATURE':
        o.hide_render = True
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 520
scene.render.resolution_y = 900 if focus == 'body' else 520
if focus == 'helmet': scene.render.resolution_x = 520
scene.render.film_transparent = False
world = bpy.data.worlds.new('w'); scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.66, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.8

def light(loc, energy, size=2):
    l = bpy.data.lights.new('l', 'AREA'); l.energy = energy; l.size = size
    o = bpy.data.objects.new('l', l); o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(o)
if focus == 'helmet':
    light((1.2, -1.5, 1.5), 120, 1); light((-1.5, 1, 1.2), 70, 1); light((0, 1.8, 0.4), 50, 1)
else:
    light((2.5, -3, 3.5), 900); light((-3, 2, 3), 500); light((0, 4, 2), 300)

COLORS = {'Jersey': (0.02, 0.09, 0.05), 'Pants': (0.9, 0.6, 0.02), 'Socks': (0.02, 0.09, 0.05),
          'Cleats': (0.9, 0.75, 0.1), 'Gloves': (0.9, 0.9, 0.9), 'Collar': (0.9, 0.6, 0.02), 'Helmet': (0.9, 0.6, 0.02)}
MATCOL = {'jersey': (0.02, 0.09, 0.05), 'sleeve': (0.02, 0.09, 0.05), 'pants': (0.9, 0.6, 0.02), 'socks': (0.02, 0.09, 0.05),
          'cleat': (0.9, 0.9, 0.9), 'glove': (0.9, 0.9, 0.9), 'skin': (0.42, 0.26, 0.17), 'eye': (0.9, 0.9, 0.9),
          'shell': (0.95, 0.62, 0.02), 'liner': (0.05, 0.05, 0.05), 'trim': (0.02, 0.02, 0.02), 'mask': (0.02, 0.12, 0.07), 'clip': (0.3, 0.3, 0.3), 'cup': (0.9, 0.9, 0.9), 'strap': (0.9, 0.9, 0.9), 'pad': (0.08, 0.08, 0.09)}
for m in bpy.data.materials:
    m.use_nodes = True
    col = MATCOL.get(m.name.split('.')[0], (0.5, 0.5, 0.5))
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*col, 1)
        bsdf.inputs['Roughness'].default_value = 0.6
for o in scene.objects:
    if o.type == 'MESH' and not o.data.materials:
        m = bpy.data.materials.new('clay'); m.use_nodes = True
        col = next((c for k, c in COLORS.items() if o.name.startswith(k)), (0.42, 0.26, 0.17))
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*col, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
        o.data.materials.append(m)

cam_data = bpy.data.cameras.new('c'); cam = bpy.data.objects.new('c', cam_data)
scene.collection.objects.link(cam); scene.camera = cam
if focus == 'body':
    target, dist = Vector((0, 0, 0.98)), 6.2; cam_data.lens = 70
elif focus == 'helmet':
    target, dist = Vector((0, 0, 0)), 1.0; cam_data.lens = 70
else:
    target, dist = Vector((0, 0, 1.72)), 1.6; cam_data.lens = 70
frames = []
for i, a in enumerate(angles):
    r = math.radians(a)
    cam.location = target + Vector((math.sin(r) * dist, -math.cos(r) * dist, 0.15 if focus != 'helmet' else 0.12))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    path = f'{out}_{i}.png'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    frames.append(path)
print('rendered', frames)
