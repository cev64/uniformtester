"""
Nike football cleat (Vapor Edge / Vapor Pro mid) for the player model.

The shoe is a subdivision-surface cage driven by silhouettes traced from
Nike's side, top and bottom product shots of the Vapor Pro (white, knit
collar), normalised by outsole length:

  upper:  rings of 20 control points from the heel cup to the toe. Each ring
          runs from the lace panel over the side of the upper, steps out over
          the sole-plate lip (a creased ledge) and round the plate underneath.
          The rings behind the throat are open on top (the collar opening);
          the heel and toe close with quad strips.
  plate:  the same cage below the lip, on the 'sole' material: a heel cup
          rising high round the back, a low flange along the forefoot.
  studs:  13 molded studs (bladed round the forefoot, wedges under the heel),
          ~13 mm, shot from the plate down to the turf.
  collar: a knit sock collar from the opening up round the player's sock.
  laces:  round laces criss-crossing seven eyelet pairs, with a tied bow.

build_cleat() returns a single mesh object with the materials
'cleat' (upper), 'sole' (plate), 'stud', 'lace' and 'cleatknit' (collar).
"""
import math
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

LS = 0.315            # outsole length (US 14)
STUD_SINK = 0.002     # stud tips pressed into the turf
STUD_LEN = 0.0128     # molded stud length below the plate
NV = 20               # control points per ring

# ─── reference profiles (fractions of LS; u = 0 heel .. 1 toe, h = height above the turf) ───
# top of the upper over the laces, side view
TOP = [(0.40, 0.385), (0.45, 0.365), (0.51, 0.342), (0.573, 0.32), (0.634, 0.295), (0.695, 0.272), (0.756, 0.245),
       (0.817, 0.226), (0.877, 0.212), (0.938, 0.197), (0.979, 0.172), (1.0, 0.125)]
# top edge of the upper round the collar opening (heel counter → under the ankle → throat)
RIM = [(0.0, 0.345), (0.04, 0.343), (0.08, 0.33), (0.13, 0.305), (0.19, 0.288), (0.25, 0.292), (0.31, 0.308), (0.37, 0.322), (0.44, 0.334), (0.5, 0.336)]
# bottom of the plate between the studs (toe spring at the front)
BOT = [(0.0, 0.07), (0.06, 0.046), (0.12, 0.037), (0.5, 0.035), (0.72, 0.036), (0.8, 0.043), (0.86, 0.052), (0.91, 0.062),
       (0.95, 0.073), (0.985, 0.088), (1.0, 0.1)]
# the sole-plate lip on the side of the shoe: a heel cup high round the back, low along the forefoot
SOLE = [(0.0, 0.215), (0.05, 0.205), (0.12, 0.175), (0.2, 0.14), (0.3, 0.105), (0.4, 0.083), (0.5, 0.073), (0.6, 0.07),
        (0.7, 0.071), (0.8, 0.077), (0.9, 0.088), (0.97, 0.1), (1.0, 0.105)]
# half widths from the top view (lateral, medial)
WL = [(0.0, 0.035), (0.04, 0.088), (0.08, 0.115), (0.12, 0.130), (0.16, 0.141), (0.20, 0.148), (0.24, 0.150), (0.28, 0.151),
      (0.32, 0.150), (0.37, 0.153), (0.45, 0.158), (0.49, 0.160), (0.53, 0.162), (0.60, 0.168), (0.68, 0.175), (0.72, 0.176),
      (0.76, 0.171), (0.80, 0.165), (0.84, 0.152), (0.88, 0.137), (0.91, 0.115), (0.93, 0.103), (0.95, 0.087), (0.97, 0.066),
      (0.99, 0.036), (1.0, 0.02)]
WM = [(0.0, 0.035), (0.04, 0.091), (0.08, 0.122), (0.12, 0.141), (0.16, 0.151), (0.20, 0.156), (0.24, 0.156), (0.28, 0.154),
      (0.32, 0.149), (0.37, 0.140), (0.45, 0.142), (0.49, 0.145), (0.53, 0.152), (0.60, 0.160), (0.68, 0.163), (0.72, 0.163),
      (0.76, 0.162), (0.80, 0.156), (0.84, 0.150), (0.88, 0.141), (0.91, 0.137), (0.93, 0.127), (0.95, 0.114), (0.97, 0.097),
      (0.99, 0.072), (1.0, 0.05)]
# back of the heel and front of the toe: u at height h
BACK = [(0.05, 0.075), (0.065, 0.06), (0.075, 0.045), (0.095, 0.031), (0.116, 0.023), (0.136, 0.016), (0.156, 0.011),
        (0.177, 0.0065), (0.197, 0.003), (0.218, 0.006), (0.238, 0.016), (0.26, 0.029), (0.28, 0.042), (0.30, 0.052), (0.33, 0.062), (0.36, 0.068)]
FRONT = [(0.08, 0.955), (0.095, 0.975), (0.116, 0.99), (0.136, 0.995), (0.156, 0.991), (0.177, 0.978), (0.2, 0.95)]

U_OPEN = 0.5    # collar opening: heel → throat (the knit collar slopes down onto the laces)
STATIONS = [0.0, 0.035, 0.08, 0.13, 0.19, 0.25, 0.31, 0.37, 0.44, U_OPEN, 0.56, 0.62, 0.68, 0.74, 0.8, 0.85, 0.895, 0.935, 0.968, 1.0]


def interp(tab, x):
    if x <= tab[0][0]:
        return tab[0][1]
    for (x0, y0), (x1, y1) in zip(tab, tab[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return tab[-1][1]


def smooth01(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def widths(u):
    """lateral and medial half widths of the upper (the plate lip stands a little proud of them)"""
    # the top view is shot from above, so the high heel cup reads wider than it is
    k = 0.9 + 0.1 * smooth01(0.3, 0.5, u)
    return interp(WL, u) * k - 0.008, interp(WM, u) * k - 0.008


def lace_drop(u):
    # the laces stand ~4 mm proud of the lace panel
    return 0.012 * smooth01(U_OPEN - 0.02, U_OPEN + 0.02, u) * (1 - smooth01(0.78, 0.84, u))


def half_ring(u, W, open_top, cap=0.0):
    """(w, h) for k = 0..10 on one side (w >= 0 outward), normalised units"""
    hs, hb = interp(SOLE, u), interp(BOT, u)
    if open_top:
        top = interp(RIM, u)
    else:
        top = interp(TOP, u) - lace_drop(u)
    lace = smooth01(U_OPEN - 0.02, U_OPEN + 0.02, u) * (1 - smooth01(0.8, 0.86, u))
    pw = 0.06 * lace + 0.42 * W * (1 - lace)          # lace panel half width / toe box crown
    span = top - hs
    toe = smooth01(0.72, 0.95, u)
    lip = 0.008 + 0.006 * (1 - smooth01(0.15, 0.45, u))  # the heel cup stands further proud
    pts = [
        (0.0, top - 0.002 * lace),                       # k0 panel centre
        (pw * (1 - 0.25 * toe), top - 0.004 * toe),      # k1 panel edge / crown of the toe box
        (0.70 * W - 0.08 * W * toe, top - (0.2 + 0.06 * toe) * span) if not open_top else (0.9 * W, top),   # k2 shoulder / rim
        (0.93 * W - 0.04 * W * toe, top - (0.52 + 0.04 * toe) * span) if not open_top else (0.98 * W, top - 0.4 * span),
        (1.0 * W, hs + (0.2 - 0.06 * toe) * span),       # k4 widest
        (0.993 * W, hs),                                 # k5 lip (upper side)
        (W + lip, hs - 0.004),                           # k6 lip (plate side)
        (W + lip - 0.0005, hb + 0.45 * (hs - hb)),       # k7 plate wall
        (W * 0.965 + 0.004, hb + 0.004),                 # k8 plate bottom edge
        (W * 0.5, hb),                                   # k9
        (0.0, hb),                                       # k10 bottom centre
    ]
    if cap:
        pts = [(w * cap, h) for w, h in pts]
    return pts


def ring(i):
    u = STATIONS[i]
    wl, wm = widths(u)
    open_top = u < U_OPEN - 1e-6
    cap = 0.0
    if i == 0:
        cap = 0.32
    elif i == len(STATIONS) - 1:
        cap = 0.3
    if cap:
        # cap rings take their shape from their neighbour, pinched across
        u_n = STATIONS[1] if i == 0 else STATIONS[-2]
        wl, wm = widths(u_n)
    lat = half_ring(u if not cap else STATIONS[1 if i == 0 else -2], wl, open_top, cap)
    med = half_ring(u if not cap else STATIONS[1 if i == 0 else -2], wm, open_top, cap)
    pts = [(lat[k][0], lat[k][1]) for k in range(11)] + [(-med[k][0], med[k][1]) for k in range(9, 0, -1)]
    out = []
    for w, h in pts:
        uu = u
        if u < 0.3:
            # the heel: follow the back of the heel cup at this height
            b = interp(BACK, h)
            uu = b + u * (1 - b / 0.3) if i else b - 0.004
        if u > 0.85:
            f = interp(FRONT, h)
            t = smooth01(0.85, 1.0, u)
            uu = u + (f - 1.0) * t if i < len(STATIONS) - 1 else f + 0.003
        out.append((uu, w, h))
    return out


def _new_obj(name, verts, faces, mats, mat_idx=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for n in mats:
        m = bpy.data.materials.get(n) or bpy.data.materials.new(n)
        me.materials.append(m)
    if mat_idx is not None:
        for p in me.polygons:
            p.material_index = mat_idx[p.index]
    return ob


def _apply_subsurf(ob, levels):
    md = ob.modifiers.new('S', 'SUBSURF')
    md.levels = md.render_levels = levels
    md.use_creases = True
    md.boundary_smooth = 'ALL'
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def _crease(ob, pairs, value):
    me = ob.data
    attr = me.attributes.get('crease_edge') or me.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    want = {tuple(sorted(p)): v for p, v in zip(pairs, value)} if isinstance(value, list) else {tuple(sorted(p)): value for p in pairs}
    for e in me.edges:
        key = tuple(sorted(e.vertices))
        if key in want:
            attr.data[e.index].value = want[key]


def _join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def foot_frame(pts, ank):
    """heel point, forward axis, outward axis and length of the (hidden) foot"""
    foot = [p for p in pts if p.z < ank.z - 0.02]
    heel = max(foot, key=lambda p: p.y)
    toe = min(foot, key=lambda p: p.y)
    ax = Vector((toe.x - heel.x, toe.y - heel.y, 0)).normalized()
    sg = 1 if heel.x > 0 else -1
    lat = Vector((-ax.y, ax.x, 0)) * (1 if (-ax.y) * sg > 0 else -1)
    L = (toe - heel).dot(ax)
    return heel, ax, lat, L


def sock_outline(sock_pts, z, centre, n=48):
    """polar outline (radius per angle) of the sock round `centre` at height z"""
    band = [p for p in sock_pts if abs(p.z - z) < 0.006]
    r = [0.0] * n
    for p in band:
        d = Vector((p.x - centre.x, p.y - centre.y))
        a = math.atan2(d.y, d.x)
        b = int(round((a / (2 * math.pi)) * n)) % n
        r[b] = max(r[b], d.length)
    # fill gaps and smooth
    for _ in range(3):
        r = [r[i] if r[i] > 0 else max(r[i - 1], r[(i + 1) % n]) for i in range(n)]
    for _ in range(2):
        r = [max(r[i], (r[i - 1] + 2 * r[i] + r[(i + 1) % n]) / 4) for i in range(n)]
    return r


def build_cleat(side, foot_pts, ank, sock_pts, ground_z):
    heel, ax, lat, L = foot_frame(foot_pts, ank)
    up = Vector((0, 0, 1))
    # the collar sits round the sock: centre the shoe on it
    sock_c = [p for p in sock_pts if abs(p.z - (ank.z + 0.035)) < 0.006]
    SC = sum(sock_c, Vector()) / len(sock_c)
    off = (Vector((SC.x, SC.y, 0)) - Vector((heel.x, heel.y, 0))).dot(lat)
    B = Vector((heel.x, heel.y, 0)) - ax * 0.013 + lat * off

    def P(u, w, h):
        return B + ax * (u * LS) + lat * (w * LS) + up * (ground_z + h * LS)

    # ── upper + plate cage
    rings = [ring(i) for i in range(len(STATIONS))]
    NR = len(rings)
    verts = [P(*p) for r in rings for p in r]
    vid = lambda i, k: i * NV + k % NV
    m_open = sum(1 for u in STATIONS if u < U_OPEN - 1e-6)     # rings 0..m_open-1 are open on top
    TOPBAND = {NV - 2, NV - 1, 0, 1}                             # faces k→k+1 removed over the opening
    PLATE = set(range(6, 14))                                    # faces k→k+1 on the plate
    faces, mat = [], []
    for i in range(NR - 1):
        for k in range(NV):
            if i < m_open and k in TOPBAND:
                continue
            faces.append((vid(i, k), vid(i, k + 1), vid(i + 1, k + 1), vid(i + 1, k)))
            mat.append(1 if k in PLATE else 0)
    # heel and toe caps: quad strips across the end rings
    for i, flip in ((0, True), (NR - 1, False)):
        strip = [(0, 1, NV - 1)] + [(k, k + 1, NV - k - 1, NV - k) for k in range(1, NV // 2 - 1)] + [(NV // 2 - 1, NV // 2, NV // 2 + 1)]
        for f in strip:
            if i == 0 and (0 in f or (1 in f and NV - 1 in f)):
                continue                    # the opening reaches round the back of the heel
            ks = f[::-1] if flip else f
            faces.append(tuple(vid(i, k) for k in ks))
            mat.append(1 if min(f) >= 6 else 0)
    up_ob = _new_obj('Cleat' + side, verts, faces, ['cleat', 'sole'], mat)
    # drop the unused top vertices of the open rings
    bm = bmesh.new(); bm.from_mesh(up_ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(up_ob.data); bm.free()
    # creases: the plate lip, the plate's bottom edge and the lace panel edges
    me = up_ob.data
    co_index = {tuple(round(c, 6) for c in v.co): v.index for v in me.vertices}
    def nv(i, k):
        return co_index.get(tuple(round(c, 6) for c in verts[vid(i, k)]))
    pairs, vals = [], []
    for i in range(NR - 1):
        for k, val in ((5, 1.0), (6, 1.0), (NV - 5, 1.0), (NV - 6, 1.0), (8, 0.4), (NV - 8, 0.4)):
            pairs.append((nv(i, k), nv(i + 1, k))); vals.append(val)
        if STATIONS[i] >= U_OPEN - 1e-6 and STATIONS[i + 1] < 0.82:
            for k in (1, NV - 1):
                pairs.append((nv(i, k), nv(i + 1, k))); vals.append(0.55)
    for i in (0, NR - 1):
        for k in (5, 6, 8):
            pairs.append((nv(i, k), nv(i, NV - k))); vals.append(1.0 if k != 8 else 0.4)
    keep = [(p, v) for p, v in zip(pairs, vals) if None not in p]
    _crease(up_ob, [p for p, v in keep], [v for p, v in keep])
    _apply_subsurf(up_ob, 2)
    # a little thickness on the open edge of the upper
    bm = bmesh.new(); bm.from_mesh(up_ob.data)
    bm.normal_update()
    bvh_up = BVHTree.FromBMesh(bm)
    rim = [(e.verts[0].co + e.verts[1].co) / 2 for e in bm.edges if e.is_boundary]
    bm.free()

    # ── studs: bladed round the forefoot, wedges under the heel (u, side fraction, length, width, angle)
    STUDS = [(0.085, 0.45, 0.07, 0.042, 0.0), (0.085, -0.45, 0.07, 0.042, 0.0),
             (0.22, 0.58, 0.062, 0.036, 0.0), (0.22, -0.58, 0.062, 0.036, 0.0),
             (0.565, 0.78, 0.058, 0.026, 10), (0.66, 0.84, 0.058, 0.026, 5), (0.755, 0.82, 0.058, 0.026, -5), (0.845, 0.72, 0.054, 0.026, -18),
             (0.58, -0.8, 0.058, 0.026, -10), (0.675, -0.84, 0.058, 0.026, -4), (0.77, -0.8, 0.058, 0.026, 6), (0.86, -0.64, 0.054, 0.026, 20),
             (0.935, 0.08, 0.05, 0.026, 90)]
    sv, sf = [], []
    for u, f, ln, wd, ang in STUDS:
        wl, wm = widths(u)
        w = f * (wl if f > 0 else wm)
        top = P(u, w, 0.5)
        hit = bvh_up.ray_cast(P(u, w, -0.2), up, 1.0)
        if hit[0] is None:
            continue
        zb = hit[0].z + 0.002
        a = math.radians(ang) * (1 if f >= 0 else 1)
        dl = ax * math.cos(a) + lat * math.sin(a)
        dw = up.cross(dl).normalized()
        c = Vector((hit[0].x, hit[0].y, 0))
        H = STUD_LEN + 0.002
        base = len(sv)
        SEG = 16
        # tapered blade: rounded rectangle-ish section, narrowing to a domed tip
        prof = [(1.12, 0.0), (1.0, 0.12), (0.9, 0.45), (0.74, 0.85), (0.62, 0.96), (0.42, 1.0)]
        for sc, t in prof:
            z = zb - H * t
            for s in range(SEG):
                th = 2 * math.pi * s / SEG
                ca, sa = math.cos(th), math.sin(th)
                x = math.copysign(abs(ca) ** 0.6, ca) * ln * LS / 2 * sc
                y = math.copysign(abs(sa) ** 0.75, sa) * wd * LS / 2 * sc
                sv.append(c + dl * x + dw * y + up * z)
        for r in range(len(prof) - 1):
            for s in range(SEG):
                a0, a1 = base + r * SEG + s, base + r * SEG + (s + 1) % SEG
                sf.append((a0, a1, a1 + SEG, a0 + SEG))
        sf.append(tuple(base + (len(prof) - 1) * SEG + s for s in range(SEG)))
    studs = _new_obj('Studs' + side, sv, sf, ['stud'])
    bm = bmesh.new(); bm.from_mesh(studs.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(studs.data); bm.free()
    _apply_subsurf(studs, 1)

    # ── knit collar: from inside the opening up round the sock
    # the rim of the opening, in order round the sock
    cxy = Vector((SC.x, SC.y))
    M = 40
    def polar(pts):
        out = [None] * M
        best = [9.0] * M
        for p in pts:
            d = Vector((p.x, p.y)) - cxy
            a = math.atan2(d.y, d.x) % (2 * math.pi)
            j = int(round(a / (2 * math.pi) * M)) % M
            err = abs(a - j * 2 * math.pi / M)
            err = min(err, 2 * math.pi - err)
            if err < best[j]:
                best[j], out[j] = err, p
        for _ in range(4):
            out = [out[j] if out[j] is not None else (out[j - 1] if out[j - 1] is not None else out[(j + 1) % M]) for j in range(M)]
        return out
    rimp = polar(rim)
    z_top_back, z_top_front = ank.z + 0.037, ank.z + 0.032
    rs = sock_outline(sock_pts, ank.z + 0.034, SC, M)
    rs2 = sock_outline(sock_pts, ank.z + 0.028, SC, M)
    rs = [max(a, b) for a, b in zip(rs, rs2)]
    rows = []
    for j in range(M):
        a = 2 * math.pi * j / M
        d = Vector((math.cos(a), math.sin(a), 0))
        fwd = d.dot(ax)                                  # +1 front, -1 back
        zt = (z_top_back + z_top_front) / 2 + (z_top_front - z_top_back) / 2 * fwd
        rp = rimp[j]
        rr = (Vector((rp.x, rp.y)) - cxy).length
        R = rs[j] + 0.0028
        cen = Vector((SC.x, SC.y, 0))
        def at(r, z):
            return cen + d * r + up * z
        rows.append([
            at(rr - 0.004, rp.z - 0.012),
            at(rr - 0.0018, rp.z - 0.0005),
            at(rr * 0.6 + R * 0.4 + 0.0015, rp.z + (zt - rp.z) * 0.4),
            at(R + 0.0006, rp.z + (zt - rp.z) * 0.82),
            at(R + 0.0004, zt - 0.003),
            at(R - 0.0006, zt + 0.0012),
            at(R - 0.0022, zt - 0.0005),
            at(R - 0.0028, zt - 0.014),
        ])
    NRW = len(rows[0])
    cv = [p for r in rows for p in r]
    cf = []
    for j in range(M):
        j2 = (j + 1) % M
        for r in range(NRW - 1):
            cf.append((j * NRW + r, j2 * NRW + r, j2 * NRW + r + 1, j * NRW + r + 1))
    knit = _new_obj('Knit' + side, cv, cf, ['cleatknit'])
    # pull loops at the back of the collar and on the tongue
    loops = []
    for want in (-1, 1):
        j = max(range(M), key=lambda j: want * (math.cos(2 * math.pi * j / M) * ax.x + math.sin(2 * math.pi * j / M) * ax.y))
        top, low = rows[j][5], rows[j][2]
        out_d = Vector((math.cos(2 * math.pi * j / M), math.sin(2 * math.pi * j / M), 0))
        side_d = up.cross(out_d).normalized()
        hgt = 0.012 if want < 0 else 0.010
        path = []
        for q in range(15):
            t = q / 14
            a = math.pi * t
            # up one leg, round the top, down the other, lying against the knit
            if t < 0.3:
                f = t / 0.3
                pnt = low.lerp(top, f) + side_d * 0.0055 + up * (hgt * 0.6 * f)
            elif t > 0.7:
                f = (1 - t) / 0.3
                pnt = low.lerp(top, f) - side_d * 0.0055 + up * (hgt * 0.6 * f)
            else:
                f = (t - 0.3) / 0.4
                pnt = top + up * (hgt * 0.6 + hgt * 0.4 * math.sin(math.pi * f)) + side_d * 0.0055 * math.cos(math.pi * f)
            pnt += out_d * (0.0012 + 0.004 * smooth01(0.0, 1.0, (pnt.z - top.z) / hgt)) * (1 if want < 0 else 1)
            path.append(pnt)
        loops.append((path, out_d))
    _crease(knit, [(j * NRW + 5, ((j + 1) % M) * NRW + 5) for j in range(M)], 0.3)
    _apply_subsurf(knit, 2)
    uvk = knit.data.uv_layers.new(name='UVMap')
    for poly in knit.data.polygons:
        for li in poly.loop_indices:
            p = knit.data.vertices[knit.data.loops[li].vertex_index].co
            a = math.atan2(p.y - SC.y, p.x - SC.x)
            uvk.data[li].uv = (a / (2 * math.pi) * 0.3 * 40, p.z * 40)

    # ── laces: seven eyelet pairs criss-crossing over the panel, tied at the throat
    def surf_top(u, w):
        o = P(u, w, 0.8)
        hit = bvh_up.ray_cast(o, -up, 1.0)
        return hit[0] if hit[0] is not None else P(u, w, interp(TOP, u))
    EY = [0.525 + 0.042 * j for j in range(7)]
    eyes = [(surf_top(u, 0.058), surf_top(u, -0.058)) for u in EY]
    lv, lf = [], []
    def tube(path, rw, rh, seg=8, ref=None):
        base = len(lv)
        n = len(path)
        for q in range(n):
            t = (path[min(n - 1, q + 1)] - path[max(0, q - 1)]).normalized()
            s = t.cross(ref if ref is not None else up)
            if s.length < 1e-6:
                s = ax.copy()
            s.normalize()
            nn = s.cross(t).normalized()
            for k in range(seg):
                a = 2 * math.pi * k / seg
                lv.append(path[q] + s * math.cos(a) * rw + nn * math.sin(a) * rh)
        for q in range(n - 1):
            for k in range(seg):
                a0, a1 = base + q * seg + k, base + q * seg + (k + 1) % seg
                lf.append((a0, a1, a1 + seg, a0 + seg))
        lf.append(tuple(base + k for k in range(seg))[::-1])
        lf.append(tuple(base + (n - 1) * seg + k for k in range(seg)))
    def arc(a, b, lift, n=10):
        out = []
        for q in range(n + 1):
            t = q / n
            p = a.lerp(b, t)
            s = surf_top((p - B).dot(ax) / LS, (p - B).dot(lat) / LS)
            out.append(Vector((p.x, p.y, max(p.z, s.z))) + up * (0.0016 + lift * math.sin(math.pi * t)))
        return out
    for j in range(len(EY) - 1):
        lat_j, med_j = eyes[j]
        lat_k, med_k = eyes[j + 1]
        tube(arc(lat_j, med_k, 0.0024 if j % 2 else 0.0012), 0.0019, 0.0014)
        tube(arc(med_j, lat_k, 0.0012 if j % 2 else 0.0024), 0.0019, 0.0014)
    # the top pair crosses to a knot with two loops and two tails lying on the collar front
    knot = (eyes[0][0] + eyes[0][1]) / 2 + up * 0.004 - ax * 0.004
    for e in eyes[0]:
        tube(arc(e, knot, 0.002, 6), 0.0019, 0.0014)
    for sgn in (1, -1):
        loop = []
        for q in range(13):
            t = q / 12
            a = math.pi * t
            loop.append(knot + lat * (sgn * 0.022 * math.sin(a)) + ax * (0.012 * (1 - math.cos(a)) - 0.004) + up * (0.002 + 0.003 * math.sin(a)))
        tube(loop, 0.0019, 0.0014)
        tail = [knot + lat * (sgn * 0.004 * t) + ax * (0.03 * t) + up * (0.002 - 0.004 * t * t) for t in [q / 6 for q in range(7)]]
        tube(tail, 0.0019, 0.0014)
    for path, od in loops:
        tube(path, 0.0007, 0.0017, 6, ref=od)
    lace_ob = _new_obj('Laces' + side, lv, lf, ['lace'])
    for poly in lace_ob.data.polygons:
        poly.use_smooth = True
    bm = bmesh.new(); bm.from_mesh(lace_ob.data)
    bm.to_mesh(lace_ob.data); bm.free()
    lace_ob.data.uv_layers.new(name='UVMap')

    # thickness on the upper's open edge
    so = up_ob.modifiers.new('T', 'SOLIDIFY'); so.thickness = 0.0018; so.offset = -1; so.use_rim = True
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(up_ob.evaluated_get(dg))
    old = up_ob.data; up_ob.modifiers.clear(); up_ob.data = me2; bpy.data.meshes.remove(old)
    # planar UVs along the shoe (fabric/knit normal map scale)
    uv = up_ob.data.uv_layers.new(name='UVMap')
    for poly in up_ob.data.polygons:
        for li in poly.loop_indices:
            p = up_ob.data.vertices[up_ob.data.loops[li].vertex_index].co
            uv.data[li].uv = ((p - B).dot(ax) * 40, p.z * 40 + (p - B).dot(lat) * 12)
    for o in (up_ob, studs, knit):
        for poly in o.data.polygons:
            poly.use_smooth = True
    for o in (studs,):
        if not o.data.uv_layers:
            o.data.uv_layers.new(name='UVMap')
    ob = _join([up_ob, studs, knit, lace_ob], 'Cleat' + side)
    return ob, (heel, ax, lat, L, B)
