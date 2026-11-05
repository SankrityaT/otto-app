#!/usr/bin/env python3
"""
Ayin otter desk-buddy enclosure — parametric source.

    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python manifold3d trimesh numpy scipy scikit-image pillow
    .venv/bin/python otter.py                 # Pi Zero 2 WH (primary) -> stl/  + renders/
    .venv/bin/python otter.py --variant xiao  # XIAO ESP32S3 Sense variant -> stl/variant_xiao/

Coordinate system (mm): +Z up, +Y = the otter's front (where it looks), +X = the
otter's own RIGHT (= your left when you face the otter). Desk is Z=0.

Every dimension that matters is a parameter in the block below.
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import manifold3d as m3d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sdf import (Grid, smin, sd_ellipsoid, sd_superseat, sd_capsule, to_trimesh, frame, place,  # noqa: E402
                 cyl, box, boxc, union, rrect, ellipse_prism, superellipse_prism)

# =============================================================================
# PARAMETERS
# =============================================================================
VARIANT = "pi"            # "pi" = Raspberry Pi Zero 2 WH + Camera Module 3 Wide (primary)
                          # "xiao" = Seeed XIAO ESP32S3 Sense + OV5640 (secondary)
RES = 0.5                 # implicit-mesh resolution (mm). 0.4 = smoother, slower.

# ---- print / fit tolerances
WALL = 2.4                # shell wall
CLR = 0.3                 # general sliding / fit clearance
PLATE_T = 4.0             # puddle base thickness (also the Z where the shells start)
M2_PILOT = 1.7            # self-tapping M2 pilot hole in PLA
M2_CLEAR = 2.5            # M2 clearance hole
M2_HEAD_D = 4.4           # counterbore for M2 pan/button head
M2_HEAD_H = 1.6
BOSS_D = 6.4

# ---- character shape (outer skin). Ground = top of the puddle base = PLATE_T.
# Chibi proportions after the team's reference (seated otter on a puddle): huge soft head
# (~55 % of the height, wider than the body), no neck, short bean body, stubby arms,
# legs sticking forward with round foot pads, thick tail curling up on one side.
G = 4.0                    # = PLATE_T (puddle thickness); the otter stands on z = G
SEAT = dict(c=(0, -2, G + 11), a=39, b=36, rz=27, n=4.0)   # bean / pear bottom (holds the Pi)
TORSO = dict(c=(0, 3, G + 40), r=(30, 28, 24))
BELLY = dict(c=(0, 12, G + 28), r=(28, 22, 22))          # round cream belly
HEAD = dict(c=(0, 3, G + 84), r=(45, 35, 36.5))          # 90 wide, 73 tall: ~60 % of the height, wider than the body
HEAD_BLEND = 16.0                                          # big blend = no neck (and a printable chin)
CHEEK = dict(c=(23, 20, G + 75), r=(14, 11, 10))         # mirrored soft cheeks
MUZZLE = dict(c=(6.5, 33.0, G + 75), r=(9.5, 7.5, 7.5))   # mirrored whisker pads (cream)
CHIN = dict(c=(0, 27, G + 68), r=(13, 9, 7))
NOSE = dict(c=(0, 40.6, G + 80), w=2.2, r=2.8)           # soft rounded-triangle nose
EAR = dict(c=(42, 1, G + 99), r=(8.5, 5.5, 8.5))          # mirrored; small, low on the sides
ARM = dict(p0=(30, 12, G + 55), p1=(24, 26, G + 41), r0=9.0, r1=8.0)   # stubby; ends at the pebble's paws   # stubby, paws at pebble sides
LEG = dict(p0=(21, 8, G + 9.5), p1=(24, 34, G + 11.5), r=10.5, r1=11.5)  # mirrored; chunky, sticks forward
SOLE = dict(c=(24.5, 40.5, G + 12.0), r=(11.5, 5.5, 11.5))                # flattened sole facing the viewer
TAIL = [(-14, -29, G + 8, 9.0), (-32, -32, G + 9, 8.6), (-46, -26, G + 10, 8.0), (-51, -21, G + 22, 7.2),
        (-50, -17, G + 35, 6.3), (-46, -14, G + 45, 5.4)]  # (x, y, z, r) thick tail curling up, otter's left
EYE = dict(x=19.5, z=G + 84, r=6.4, bulge=1.9)            # big, low, wide-set glossy domes (paint gloss black)
EYE_HOLES = False         # True -> through-holes for 10 mm safety-eye / dome inserts instead of domes
EYE_HOLE_D = 10.0
FRECKLES = [(-9, 2.5), (-12.5, 0.5), (-10, -2.5)]        # (dx from pad centre, dz) on each whisker pad

# ---- split + joints
ROOF_APEX_Z = G + 116.0   # apex of the 45° internal roof cone in the head
Y_SPLIT = -6.0           # front/back shell split plane (vertical, y = Y_SPLIT)
LIP_H = 2.0               # alignment lip on the front shell (protrudes into the back shell)
LIP_T = 1.2
LIP_CLR = 0.25
HEAD_SCREWS = [(32.0, G + 86.0), (-32.0, G + 86.0)]   # (x, z) horizontal M2 screws, back->front
BASE_SCREWS = [(30.0, 22.0), (-30.0, 22.0),   # (x, y) vertical M2 screws from under the puddle
               (37.0, -17.0), (-37.0, -17.0)]

# ---- pebble / camera
CAM_TILT = 12.0           # deg: camera axis tilted down toward the desk (30–60 cm in front)
PEBBLE_ORIGIN = (0.0, 26.5, G + 46.0)   # centre of pebble back face
PEB = dict(a=22.5, b=19.5, c_top=9.2, c_bot=3.0, p1=1.25, p2=4.0)
# smooth egg-stone, fatter at the bottom: (r²)^p1 + (w/c(v))^p2 = 1 with r² = (u/a)²+(v/b)²,
# c(v) = c_top + c_bot·clip(-v/b)^1.5. Front of the pebble is plain except a small lens window.
PAW = dict(u=19.5, v=-9.0, w=3.5, r=(7.5, 8.0, 6.5))   # paws are part of the pebble part (paint tan)
LENS_U = 0.0              # lens centred left-right
LENS_V = 0.0              # lens height on the egg (the egg's fat bottom makes this read as upper-middle)
LENS_FRONT_W = 7.2        # lens front plane (local w); keeps the CM3 lens block below the pebble back
RING_ID = 7.6             # translucent light ring around the lens barrel (ø6.95), visible as a ~1 mm halo
RING_OD = 11.0
RING_TAB_T = 1.2
RING_TAB_W = 6.0
LED_V = 13.0              # LED (3 mm) above the camera board, shines into the ring's tab
LED_D = 3.1
PEB_SCREWS = [(-19.5, -9.0), (19.5, -9.0), (-11.0, 13.0)]   # (u, v) M2x6 from inside: two into the paws, one top
# hidden shutter blade: slides DOWN in a slot just under the egg's skin, exits at the bottom edge
BLADE_T = 0.8             # blade thickness (prints flat, 4 layers)
SLOT_CLR = 0.15           # per side
BLADE_HALF_W = 5.6        # blade half-width (u)
FOV_H, FOV_V = 52.0, 35.0 # half-angles kept clear in front of the lens (CM3 Wide: 51° x 33.5°)
BLADE_TRAVEL = 11.0
BLADE_PEEK = 4.6          # how far the closed blade's nub sits below the egg's bottom edge

# ---- electronics (all from datasheets; see README for sources)
# Raspberry Pi Zero 2 W (official mechanical drawing): 65 x 30, holes 3.5 from edges (58 x 23),
# mini-HDMI / USB / PWR centres at 12.4 / 41.4 / 54.0 mm from the SD-card end.
PI = dict(L=65.0, W=30.0, T=1.4, hole_in=3.5, hole_d=2.75, ports=dict(hdmi=12.4, usb=41.4, pwr=54.0),
          standoff=6.0, top_comp=3.2, header_len=51.0, header_w=5.2, header_keepout_h=30.0)
PI_POS = (0.0, -9.0)     # board centre (x, y); ports face the back (-y), camera connector at +x
# Camera Module 3 Wide (RPi product brief): 25 x 23.862 board, holes ø2.2 at 2.0 from edges
# (21 x 12.5 spacing), lens centre 14.4 from the bottom edge, total height 12.4 (wide).
CM3 = dict(w=25.0, h=23.862, pcb=1.0, total=12.4, hole_dx=21.0, holes_v=(2.0, 14.5), lens_v=14.4,
           lens_block=8.6, lens_block_h=4.0, barrel_d=6.95)
AMP = dict(w=19.4, d=17.8, t=1.6, h=11.0)         # Adafruit MAX98357A #3006 (0.75" x 0.7"); stands upright in a card slot
AMP_POS = (-23.0, 10.0)   # slot centre (x, y); board plane is XZ, terminal block faces +y
SPK = dict(w=30.0, h=20.0, d=9.0)                 # 2030-class cavity speaker (unverified, foam-shim)
SPK_CAGE_Y = 25.8                                 # speaker front face y (foam-shim up to the grille wall)
MIC = dict(d=14.0, t=1.6)                         # INMP441 round module (unverified ~14 mm)
MIC_DIR = (0.74, 0.46, -0.50)                     # from head centre toward the otter's right cheek
MIC_PIN_D = 1.5
GRILLE = dict(z=G + 13.0, pitch=3.2, hole_d=1.8, rings=2)
# XIAO variant
XIAO = dict(w=21.0, d=17.8, h=15.0)               # XIAO ESP32S3 Sense incl. expansion board (Seeed wiki)
LIPO = dict(l=36.0, w=17.0, t=7.8)                # Adafruit #3898 400 mAh (≈35.6x15.2x7.6; ~36x17x7.8)
LIPO_POS = (0.0, -14.0)                           # XIAO variant: LiPo stands on its long edge, taped to the pedestal back
OV5640_LENS_SQ = 8.6                              # OV5640-for-XIAO lens block (UNVERIFIED)

BAY = dict(x0=1.0, x1=30.0, z1=G + 15.0, face_y=-27.0, face_t=2.0)  # recessed USB port bay (back)
VENT_BACK = dict(z0=G + 17.0, z1=G + 29.0, w=2.2, xs=(-12, -7, -2, 3, 8, 13), y_max=-20.0)
VENT_PLATE = dict(xs=(-14, -9, -4, 1, 6, 11), y0=-21.0, y1=-3.0, w=2.2)

PUDDLE = dict(c=(-6.0, 2.0), rx=64.0, ry=56.0, waves=((5, 0.05, 0.3), (3, 0.04, 1.1), (7, 0.025, 2.0)),
              edge_r=1.8, ripple_h=0.6, ripples=(5.0, 12.0))   # wavy translucent-teal puddle = base plate
COLORS = dict(tan=(196, 160, 122), cream=(243, 230, 205), teal=(122, 176, 160), puddle=(150, 200, 190), pad=(110, 75, 55),
              white=(250, 250, 245), dark=(60, 45, 40), pcb=(40, 120, 70), pcb_blue=(40, 80, 150),
              spk=(70, 70, 75), amp=(120, 40, 140), mic=(30, 100, 160), led=(250, 210, 80))

GRID_LO = (-62.0, -50.0, 1.0)
GRID_HI = (56.0, 54.0, 127.0)


# =============================================================================
# OUTER CHARACTER FIELD
# =============================================================================
def tail_field(X, Y, Z):
    pts = np.array(TAIL, float)
    # Catmull-Rom resample for a smooth curl
    P = np.vstack([pts[0], pts, pts[-1]])
    samp = []
    for i in range(1, len(P) - 2):
        for t in np.linspace(0, 1, 6, endpoint=False):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            samp.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 +
                               (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    samp.append(pts[-1])
    f = None
    for a_, b_ in zip(samp[:-1], samp[1:]):
        d = sd_capsule(X, Y, Z, a_[:3], b_[:3], a_[3], b_[3])
        f = d if f is None else np.minimum(f, d)
    return f


def core_field(X, Y, Z):
    s = SEAT
    f = sd_superseat(X, Y, Z, s["c"], s["a"], s["b"], s["rz"], s["n"])
    f = smin(f, sd_ellipsoid(X, Y, Z, TORSO["c"], TORSO["r"]), 12)
    f = smin(f, sd_ellipsoid(X, Y, Z, BELLY["c"], BELLY["r"]), 8)
    f = smin(f, sd_ellipsoid(X, Y, Z, HEAD["c"], HEAD["r"]), HEAD_BLEND)
    return f


def mirror(c):
    return (-c[0], c[1], c[2])


def nose_field(X, Y, Z):
    c, w, r = NOSE["c"], NOSE["w"], NOSE["r"]
    f = sd_ellipsoid(X, Y, Z, (c[0] - w, c[1] - 0.4, c[2] + 1.2), (r, r * 0.85, r))
    f = smin(f, sd_ellipsoid(X, Y, Z, (c[0] + w, c[1] - 0.4, c[2] + 1.2), (r, r * 0.85, r)), 2.5)
    f = smin(f, sd_ellipsoid(X, Y, Z, (c[0], c[1] + 0.2, c[2] - 2.0), (r * 0.9, r * 0.85, r * 0.9)), 2.5)
    return f


def outer_field(X, Y, Z):
    f = core_field(X, Y, Z)
    for sx in (1, -1):
        cc = CHEEK["c"] if sx > 0 else mirror(CHEEK["c"])
        f = smin(f, sd_ellipsoid(X, Y, Z, cc, CHEEK["r"]), 7)
    f = smin(f, sd_ellipsoid(X, Y, Z, CHIN["c"], CHIN["r"]), 5)
    for sx in (1, -1):
        mc = MUZZLE["c"] if sx > 0 else mirror(MUZZLE["c"])
        f = smin(f, sd_ellipsoid(X, Y, Z, mc, MUZZLE["r"]), 4)
    f = smin(f, nose_field(X, Y, Z), 1.2)
    for sx in (1, -1):
        ec = EAR["c"] if sx > 0 else mirror(EAR["c"])
        f = smin(f, sd_ellipsoid(X, Y, Z, ec, EAR["r"]), 4.5)
        p0, p1 = ARM["p0"], ARM["p1"]
        if sx < 0:
            p0, p1 = mirror(p0), mirror(p1)
        f = smin(f, sd_capsule(X, Y, Z, p0, p1, ARM["r0"], ARM["r1"]), 6)
        q0, q1 = LEG["p0"], LEG["p1"]
        if sx < 0:
            q0, q1 = mirror(q0), mirror(q1)
        f = smin(f, sd_capsule(X, Y, Z, q0, q1, LEG["r"], LEG["r1"]), 6)
        sc = SOLE["c"] if sx > 0 else mirror(SOLE["c"])
        f = smin(f, sd_ellipsoid(X, Y, Z, sc, SOLE["r"]), 4)
    f = smin(f, tail_field(X, Y, Z), 6)
    return f


# =============================================================================
# GEOMETRY HELPERS
# =============================================================================
def f_at(p):
    p = np.asarray(p, float).reshape(-1, 3)
    return outer_field(p[:, 0], p[:, 1], p[:, 2])


def surface_hit(p0, d, t_max=80.0):
    """First outer-surface crossing walking from p0 (outside) along d."""
    d = np.asarray(d, float); d /= np.linalg.norm(d)
    ts = np.linspace(0, t_max, 801)
    vals = f_at(np.asarray(p0) + ts[:, None] * d)
    idx = np.nonzero(vals < 0)[0][0]
    lo, hi = ts[idx - 1], ts[idx]
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        if f_at(np.asarray(p0) + mid * d)[0] < 0:
            hi = mid
        else:
            lo = mid
    p = np.asarray(p0) + hi * d
    return p, normal_at(p)


def normal_at(p, h=0.05):
    p = np.asarray(p, float)
    g = np.array([(f_at(p + e)[0] - f_at(p - e)[0]) for e in np.eye(3) * h])
    return g / np.linalg.norm(g)


def lframe(origin, w_axis, up=(0, 0, 1)):
    """Right-handed local frame: w = w_axis, v ~ up, u = v x w."""
    w = np.asarray(w_axis, float); w /= np.linalg.norm(w)
    v = np.asarray(up, float) - np.dot(up, w) * w; v /= np.linalg.norm(v)
    u = np.cross(v, w)
    return np.asarray(origin, float), u, v, w


def oriented_ellipsoid(center, normal, rx, ry, rz, up=(0, 0, 1)):
    s = m3d.Manifold.sphere(1.0, 48).scale([rx, ry, rz])
    return place(s, lframe(center, normal, up))


def teardrop_prism(r, length, outward_x):
    """Boss along -w (local), 45° teardrop point downward, webbed outward in x so it prints
    upright without support. Returns solid in a frame where u=x, v=z, w=-y."""
    t = np.linspace(-np.pi / 4, np.pi + np.pi / 4, 40)
    pts = [[r * np.cos(a), r * np.sin(a)] for a in t] + [[0.0, -r * np.sqrt(2)]]
    cs = m3d.CrossSection([np.array(pts)])
    a = m3d.Manifold.extrude(cs, length)
    b = a.translate([outward_x, 0, 0])
    return m3d.Manifold.batch_hull([a, b])


PEB_FRAME = lframe(PEBBLE_ORIGIN, (0, np.cos(np.radians(CAM_TILT)), -np.sin(np.radians(CAM_TILT))))


def P(u, v, w):
    o, U, V, W = PEB_FRAME
    return o + u * U + v * V + w * W


SLOT_FLOOR = LENS_FRONT_W + 0.1
SLOT_TOP = SLOT_FLOOR + BLADE_T + 2 * SLOT_CLR
CAM_BACK_W = LENS_FRONT_W - CM3["total"]
CAM_FRONT_W = CAM_BACK_W + CM3["pcb"]


# =============================================================================
# PARTS
# =============================================================================
def build_fields():
    t0 = time.time()
    g = Grid(GRID_LO, GRID_HI, RES)
    F = outer_field(g.X, g.Y, g.Z)
    Fc = core_field(g.X, g.Y, g.Z)
    from scipy import ndimage
    sd = g.signed_edt(Fc < 0)
    sd = ndimage.gaussian_filter(sd, 1.0)
    print(f"  fields {time.time() - t0:.1f}s")
    return g, F, sd


def peb_c(V):
    return PEB["c_top"] + PEB["c_bot"] * np.clip(-V / PEB["b"], 0, 1) ** 1.5


def peb_surface(u, v):
    """Front surface height w of the bare egg at (u, v) (nan outside)."""
    r2 = (u / PEB["a"]) ** 2 + (v / PEB["b"]) ** 2
    t = 1 - r2 ** PEB["p1"]
    return np.where(t > 0, peb_c(v) * np.abs(t) ** (1 / PEB["p2"]), np.nan)


def window_half(h):
    """Half-size (u, v) of the clear FOV opening at height h above the lens front."""
    r = CM3["barrel_d"] / 2
    return r + h * np.tan(np.radians(FOV_H)), r + h * np.tan(np.radians(FOV_V))


def blade_geom():
    wu, wv = window_half(SLOT_TOP - LENS_FRONT_W)
    top_closed = LENS_V + wv + 1.0
    # where the slot ceiling leaves the egg at the bottom (u = 0)
    vs = np.linspace(-PEB["b"], 0, 2000)
    surf = peb_surface(np.zeros_like(vs), vs)
    ok = np.nan_to_num(surf, nan=0) >= SLOT_TOP
    v_exit = vs[np.argmax(ok)]
    bottom_closed = v_exit - BLADE_PEEK
    return dict(top=top_closed, bottom=bottom_closed, v_exit=v_exit, win=(wu, wv))


def make_pebble(with_paws=True):
    """Teal egg-stone in local (u, v, w); w = 0 is its flat back. Paws (paint tan) are part of it."""
    a, b = PEB["a"], PEB["b"]
    g = Grid((-a - 9, -b - 2, -1), (a + 9, b + 2, PEB["c_top"] + PEB["c_bot"] + 1), 0.25)
    U, V, Wc = g.X, g.Y, g.Z
    r2 = (U / a) ** 2 + (V / b) ** 2
    q = (r2 ** PEB["p1"] + np.abs(Wc / peb_c(V)) ** PEB["p2"])
    f = (q ** (1 / PEB["p2"]) - 1) * PEB["c_top"]
    if with_paws:
        for su in (1, -1):
            f = smin(f, sd_ellipsoid(U, V, Wc, (su * PAW["u"], PAW["v"], PAW["w"]), PAW["r"]), 3.0)
    f = np.maximum(f, -Wc)
    peb = g.mesh(f).trim_by_plane([0, 0, 1], 0.0)
    bg = blade_geom()
    hw = BLADE_HALF_W + SLOT_CLR
    # hidden blade slot, open at the bottom edge
    slot = boxc([LENS_U - hw, bg["bottom"] - 30, SLOT_FLOOR], [LENS_U + hw, bg["top"] + SLOT_CLR + 0.3, SLOT_TOP])
    peb = peb - slot
    # small lens window through the skin (FOV cone from the lens front)
    wu0, wv0 = window_half(SLOT_TOP - LENS_FRONT_W - 0.01)
    h1 = PEB["c_top"] + 3 - LENS_FRONT_W
    wu1, wv1 = window_half(h1)
    e0 = ellipse_prism(wu0, wv0, 0.01).translate([LENS_U, LENS_V, SLOT_TOP - 0.01])
    e1 = ellipse_prism(wu1, wv1, 0.01).translate([LENS_U, LENS_V, LENS_FRONT_W + h1])
    peb = peb - m3d.Manifold.batch_hull([e0, e1])
    # light-ring bore (back -> slot floor) + LED tab slot
    peb = peb - cyl(SLOT_FLOOR + 1, RING_OD / 2 + 0.15, seg=96).translate([LENS_U, LENS_V, -1])
    peb = peb - ring_tab(RING_TAB_T + 0.3, grow=0.3).translate([0, 0, -1.0])
    for (u, v) in PEB_SCREWS:
        peb = peb - cyl(4.5, M2_PILOT / 2, seg=24).translate([u, v, -0.1])
    return peb


def ring_tab(t, grow=0.0):
    """Light-pipe tab from the ring up to the LED (sits in a slot in the pebble back)."""
    tab_h = LED_V + 2.6 - LENS_V
    return rrect(RING_TAB_W + 2 * grow, tab_h + grow, 1.5, t + 1.0).translate([LENS_U, LENS_V + tab_h / 2, 0])


def make_ring():
    """Translucent halo: tube around the lens barrel from the pebble back up to the blade slot floor,
    plus a tab up to the LED. Prints tab-down. Seen through the window as a ~1 mm glow around the lens."""
    tube = cyl(SLOT_FLOOR, RING_OD / 2, seg=96).translate([LENS_U, LENS_V, 0])
    tab = ring_tab(RING_TAB_T).translate([0, 0, -1.0]) ^ boxc([-50, -50, 0], [50, 50, RING_TAB_T])
    bore = cyl(40, RING_ID / 2, seg=96).translate([LENS_U, LENS_V, -5])
    return (tube + tab) - bore


def make_shutter():
    """Hidden shutter blade, printed flat: 0.8 mm teal strip + a rounded nub at its lower end.
    Local coords as installed when CLOSED (u, v), z=0 on the slot floor."""
    bg = blade_geom()
    L = bg["top"] - bg["bottom"]
    blade = rrect(2 * BLADE_HALF_W, L, 2.0, BLADE_T).translate([LENS_U, (bg["top"] + bg["bottom"]) / 2, 0])
    nub = m3d.Manifold.sphere(1.0, 48).scale([4.6, 2.4, 2.4]).translate([LENS_U, bg["bottom"] + 1.6, BLADE_T])
    nub = nub ^ boxc([-50, -100, 0], [50, 100, 10])
    return blade + nub


def shutter_in_pebble(closed=True):
    dv = 0.0 if closed else -BLADE_TRAVEL
    return make_shutter().translate([0, dv, SLOT_FLOOR + SLOT_CLR])


def cm3_model():
    """Camera Module 3 Wide in pebble-local coords."""
    bw, bh = CM3["w"], CM3["h"]
    v0 = LENS_V - CM3["lens_v"]
    board = boxc([LENS_U - bw / 2, v0, CAM_BACK_W], [LENS_U + bw / 2, v0 + bh, CAM_FRONT_W])
    for hu in (-CM3["hole_dx"] / 2, CM3["hole_dx"] / 2):
        for hv in CM3["holes_v"]:
            board = board - cyl(5, 1.1, seg=16).translate([LENS_U + hu, v0 + hv, CAM_BACK_W - 1])
    blk = boxc([LENS_U - CM3["lens_block"] / 2, LENS_V - CM3["lens_block"] / 2, CAM_FRONT_W],
               [LENS_U + CM3["lens_block"] / 2, LENS_V + CM3["lens_block"] / 2, CAM_FRONT_W + 4.0])
    barrel = cyl(LENS_FRONT_W - CAM_FRONT_W, CM3["barrel_d"] / 2, seg=48).translate([LENS_U, LENS_V, CAM_FRONT_W])
    conn = boxc([LENS_U - 10, v0 + 0.5, CAM_BACK_W - 2.6], [LENS_U + 10, v0 + 6.0, CAM_BACK_W])
    return board, blk + barrel, conn


def to_world(man):
    o, U, V, W = PEB_FRAME
    return man.transform(np.column_stack([U, V, W, o]))


def puddle_outline(n=360):
    P = PUDDLE
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    k = 1.0 + sum(a * np.sin(f * t + ph) for (f, a, ph) in P["waves"])
    return np.column_stack([P["c"][0] + P["rx"] * k * np.cos(t), P["c"][1] + P["ry"] * k * np.sin(t)])


def make_puddle(OUTER):
    """Wavy translucent-teal puddle = base plate. Flat bottom, rounded top edge, two soft ripple
    rings on the exposed water (kept clear of the otter's footprint so the shells sit flat)."""
    from matplotlib.path import Path
    from scipy import ndimage
    P, T, R = PUDDLE, PLATE_T, PUDDLE["edge_r"]
    res = 0.3
    poly = puddle_outline()
    lo = poly.min(0) - 4; hi = poly.max(0) + 4
    xs = np.arange(lo[0], hi[0], res); ys = np.arange(lo[1], hi[1], res)
    XX, YY = np.meshgrid(xs, ys, indexing="ij")
    pts = np.column_stack([XX.ravel(), YY.ravel()])
    inside = Path(poly).contains_points(pts).reshape(XX.shape)
    d2 = np.where(inside, -ndimage.distance_transform_edt(inside), ndimage.distance_transform_edt(~inside)) * res
    d2 = ndimage.gaussian_filter(d2, 1.0)
    # otter footprint keep-out for ripples
    fp_mask = np.zeros_like(inside)
    for loop in OUTER.slice(PLATE_T + 0.3).to_polygons():
        fp_mask |= Path(np.asarray(loop)).contains_points(pts).reshape(XX.shape)
    dfp = ndimage.distance_transform_edt(~fp_mask) * res
    ripple = sum(np.exp(-((-d2 - r0) / 1.1) ** 2) for r0 in P["ripples"])
    ripple *= np.clip((dfp - 3.0) / 3.0, 0, 1)
    zs = np.arange(-0.6, T + P["ripple_h"] + 1.0, 0.15)
    D = d2[:, :, None]; Z = zs[None, None, :]
    qx, qz = D + R, Z - (T - R)
    f = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qz, 0) ** 2) + np.minimum(np.maximum(qx, qz), 0) - R
    f = f - P["ripple_h"] * ripple[:, :, None] * (Z > T - 1.0)
    f = np.maximum(f, -Z)
    f[0], f[-1], f[:, 0], f[:, -1], f[:, :, 0], f[:, :, -1] = 1e3, 1e3, 1e3, 1e3, 1e3, 1e3
    from skimage.measure import marching_cubes
    from sdf import mesh_to_manifold
    v, tr, _, _ = marching_cubes(f.astype(np.float32), 0.0, spacing=(res, res, 0.15), gradient_direction="ascent")
    v += np.array([xs[0], ys[0], zs[0]])
    m = mesh_to_manifold(v, tr).trim_by_plane([0, 0, 1], 0.0)
    return m


def build(variant="pi", outdir=None, quick=False):
    t_start = time.time()
    g, F, sd = build_fields()
    outer_full = g.mesh(F)
    OUTER = outer_full.trim_by_plane([0, 0, 1], PLATE_T - 0.6)
    # self-supporting 45° 'attic' inside the head so the shells print upright with no internal support
    roof = g.Z + np.sqrt(g.X ** 2 + (g.Y - HEAD["c"][1]) ** 2) - ROOF_APEX_Z
    cavity = g.mesh(np.maximum(sd + WALL, roof))
    cav_clr = g.mesh(sd + WALL + CLR)           # what loose internal parts must stay inside
    cav_rim = g.mesh(sd + WALL + CLR + 1.6)
    print(f"  meshes {time.time() - t_start:.1f}s")
    BIG = 400

    def slab(z0, z1):
        return boxc([-BIG, -BIG, z0], [BIG, BIG, z1])

    def yhalf(front=True):
        return boxc([-BIG, Y_SPLIT, -BIG], [BIG, BIG, BIG]) if front else boxc([-BIG, -BIG, -BIG], [BIG, Y_SPLIT, BIG])

    shell = (OUTER - cavity) ^ slab(PLATE_T, BIG)

    # ---------------------------------------------------------------- face details
    face_cuts, face_adds = [], []
    eyes = []
    highlights = []
    for sx in (1, -1):
        p, n = surface_hit((sx * EYE["x"], 80, EYE["z"]), (0, -1, 0))
        eyes.append((p, n))
        if EYE_HOLES:
            face_cuts.append(place(cyl(20, EYE_HOLE_D / 2, seg=64, center=True), lframe(p, n)))
        else:   # big glossy dome (paint gloss black) with a small raised highlight bead (paint white)
            dome = m3d.Manifold.sphere(1.0, 128).scale([EYE["r"], EYE["r"] * 1.06, EYE["bulge"] + 0.3])
            face_adds.append(place(dome, lframe(p - n * 0.3, n)))
            _, Ue, Ve, We = lframe(p, n)
            hx = Ue if Ue[0] > 0 else -Ue
            off = 2.3 * hx + 2.4 * Ve
            rr = np.hypot(2.3, 2.4) / EYE["r"]
            hz = (EYE["bulge"] + 0.3) * np.sqrt(max(0, 1 - rr ** 2)) - 0.3
            hc = p + off + n * hz
            highlights.append(hc)
            face_adds.append(m3d.Manifold.sphere(1.25, 32).translate(list(hc - n * 0.6)))
    # mouth: small smooth 'w' smile groove under the nose (1.2 wide, ~0.5 deep)
    def groove(pts, r=0.6, depth=0.45):
        balls = []
        for (x, z) in pts:
            p, n = surface_hit((x, 80, z), (0, -1, 0))
            balls.append(m3d.Manifold.sphere(r, 20).translate(list(p - n * (r - depth))))
        return union([m3d.Manifold.batch_hull([a_, b_]) for a_, b_ in zip(balls[:-1], balls[1:])])
    nz = NOSE["c"][2]
    face_cuts.append(groove([(0, nz - 2.6 - 0.4 * k) for k in range(5)]))           # philtrum
    for sx in (1, -1):
        t = np.linspace(0, np.pi, 14)
        face_cuts.append(groove([(sx * (2.3 - 2.3 * np.cos(tt)), nz - 4.6 - 1.9 * np.sin(tt)) for tt in t]))
    # freckles on the whisker pads
    for sx in (1, -1):
        for (dx, dz) in FRECKLES:
            p, n = surface_hit((sx * (MUZZLE["c"][0] - dx), 80, MUZZLE["c"][2] + dz), (0, -1, 0))
            face_cuts.append(m3d.Manifold.sphere(0.75, 16).translate(list(p + n * 0.3)))
    # raised toe-bean pads on the soles (front faces of the chunky legs)
    beans = []
    for sx in (1, -1):
        fx, fz = sx * SOLE["c"][0], SOLE["c"][2]
        p, n = surface_hit((fx, 80, fz - 2.0), (0, -1, 0))
        face_adds.append(oriented_ellipsoid(p - n * 0.4, n, 5.2, 4.3, 1.3))
        beans.append((p, 5.2, 4.3))
        for (dx, dz) in [(-5.4, 4.6), (0, 6.6), (5.4, 4.6)]:
            q, nq = surface_hit((fx + dx, 80, fz + dz), (0, -1, 0))
            face_adds.append(oriented_ellipsoid(q - nq * 0.4, nq, 2.0, 2.0, 1.2))
            beans.append((q, 2.0, 2.0))
    # whisker grooves: three soft lines fanning out from each whisker pad
    for sx in (1, -1):
        for k, (z0, dz) in enumerate([(2.5, 2.5), (0.0, 0.0), (-2.5, -2.6)]):
            pts = []
            for t in np.linspace(0, 1, 12):
                x = sx * (MUZZLE["c"][0] + 7.5 + 10.0 * t)
                z = MUZZLE["c"][2] + z0 + dz * t + 0.8 * np.sin(np.pi * t)
                pts.append((x, z))
            face_cuts.append(groove(pts, r=0.45, depth=0.35))
    shell = (shell + (union(face_adds) ^ slab(PLATE_T, BIG))) - union(face_cuts)
    OUTER = OUTER + union(face_adds)

    # ---------------------------------------------------------------- pebble seat on the belly
    o, U, V, Wv = PEB_FRAME
    peb_proj = make_pebble().project()                      # outline of egg + paws seen from the front
    depth = PEB["c_top"] + PEB["c_bot"] + 2.0
    seat_cut = to_world(m3d.Manifold.extrude(peb_proj.offset(0.4, m3d.JoinType.Round), depth))
    # a 2.4 mm cup around the pocket (back plate + side walls) closes the belly where the tilted pocket
    # cuts through it; its underside is a short bridge between the seat plate and the belly wall.
    seat_wall = to_world(m3d.Manifold.extrude(peb_proj.offset(0.4 + WALL, m3d.JoinType.Round), WALL + depth)
                         .translate([0, 0, -WALL])) ^ OUTER
    shell = (shell - seat_cut) + (seat_wall - seat_cut)
    # channel below the pebble for the shutter blade + nub when pulled open (keeps a 1.2 mm floor)
    bgm = blade_geom()
    ch = boxc([LENS_U - BLADE_HALF_W - 0.6, bgm["bottom"] - BLADE_TRAVEL - 2.0, SLOT_FLOOR - 0.4],
              [LENS_U + BLADE_HALF_W + 0.6, bgm["v_exit"], SLOT_TOP + 3.0])
    ch_floor = boxc([LENS_U - BLADE_HALF_W - 1.8, bgm["bottom"] - BLADE_TRAVEL - 3.2, SLOT_FLOOR - 1.6],
                    [LENS_U + BLADE_HALF_W + 1.8, bgm["v_exit"], SLOT_TOP + 3.0])
    near_skin = OUTER - g.mesh(sd + WALL + 1.4)
    shell = (shell - to_world(ch)) + (((to_world(ch_floor - ch) ^ near_skin) - seat_cut))
    # camera posts (M2 self-tap) and openings
    v0 = LENS_V - CM3["lens_v"]
    posts, post_holes = [], []
    if variant == "pi":
        for hu in (-CM3["hole_dx"] / 2, CM3["hole_dx"] / 2):
            for hv in CM3["holes_v"]:
                c = (LENS_U + hu, v0 + hv)
                posts.append(cyl(-CAM_FRONT_W - 0.5, 2.3, seg=32).translate([c[0], c[1], CAM_FRONT_W]))
                post_holes.append(cyl(-CAM_FRONT_W + 0.5 - 1.0, M2_PILOT / 2, seg=16).translate([c[0], c[1], CAM_FRONT_W - 0.1]))
        cam_open = rrect(CM3["lens_block"] + 2.4, CM3["lens_block"] + 2.4, 2.0, 10).translate([LENS_U, LENS_V, -6])
    else:
        sq = OV5640_LENS_SQ + 0.4
        sock = rrect(sq + 3.2, sq + 3.2, 1.5, 8).translate([LENS_U, LENS_V, -8 - WALL + 0.01])
        posts.append(sock)
        cam_open = rrect(sq, sq, 0.6, 20).translate([LENS_U, LENS_V, -12])
    led_tube = (cyl(7.0, LED_D / 2 + 1.6, seg=32) - cyl(9, LED_D / 2, seg=24).translate([0, 0, -1])).translate([LENS_U, LED_V, -WALL - 7.0])
    led_hole = cyl(20, LED_D / 2, seg=24).translate([LENS_U, LED_V, -15])
    peb_holes = union([cyl(20, M2_CLEAR / 2, seg=20).translate([u, v, -15]) for (u, v) in PEB_SCREWS])
    shell = shell + (to_world(union(posts) + led_tube) ^ OUTER)
    ring_clear = cyl(SLOT_FLOOR + 1, RING_OD / 2 + 0.3, seg=64).translate([LENS_U, LENS_V, -0.01])
    shell = shell - to_world(union(post_holes + [cam_open, led_hole, peb_holes, ring_clear]))
    # paws: notch so the pebble drops straight in (already removed by seat_cut sweep)

    # ---------------------------------------------------------------- speaker grille
    gp, gn = surface_hit((0, 80, GRILLE["z"]), (0, -1, 0))
    holes = [(0.0, 0.0)]
    for ring in range(1, GRILLE["rings"] + 1):
        k = 6 * ring
        for i in range(k):
            a = 2 * np.pi * i / k + (np.pi / 6 if ring % 2 == 0 else 0)
            holes.append((ring * GRILLE["pitch"] * np.cos(a), ring * GRILLE["pitch"] * np.sin(a)))
    gr = []
    for (dx, dz) in holes:
        gr.append(cyl(30, GRILLE["hole_d"] / 2, seg=20).rotate([-90, 0, 0]).translate([gp[0] + dx, gp[1] - 20, gp[2] + dz]))
    shell = shell - union(gr)

    # ---------------------------------------------------------------- mic pinhole + INMP441 holder
    hc = np.array(HEAD["c"], float)
    mp, mn = surface_hit(hc + 80 * np.asarray(MIC_DIR) / np.linalg.norm(MIC_DIR), -np.asarray(MIC_DIR))
    from scipy.ndimage import map_coordinates
    def sd_at(p):
        idx = (np.asarray(p) - g.lo) / g.res
        return map_coordinates(sd, idx.reshape(3, 1), order=1)[0]
    t_wall = 0.0
    while sd_at(mp - mn * t_wall) > -WALL and t_wall < 20:
        t_wall += 0.1
    mo = mp - mn * t_wall
    gi = np.array([sd_at(mo + e) - sd_at(mo - e) for e in np.eye(3) * 0.5]); gi /= np.linalg.norm(gi)
    mic_fr = lframe(mo, -gi)   # w points inward, square to the inner wall
    md = MIC["d"] + 0.5
    holder = cyl(4.6, md / 2 + 1.6, seg=64) + cyl(3.2, md / 2 + 1.6 + 3.2, md / 2 + 1.6, seg=64)
    holder = holder - cyl(6, md / 2, seg=64).translate([0, 0, 0.0])
    holder = holder.translate([0, 0, -0.6])
    shell = shell + (place(holder, mic_fr) ^ OUTER)
    shell = shell - place(cyl(t_wall + 4, MIC_PIN_D / 2, seg=20).translate([0, 0, -t_wall - 2]), mic_fr)
    shell = shell - place(cyl(1.0, 2.6, seg=32).translate([0, 0, -0.5]), mic_fr)   # little acoustic chamber
    shell = shell - place(cyl(12.0, md / 2, seg=64).translate([0, 0, -0.6]), mic_fr)   # clear pocket + wire exit

    # ---------------------------------------------------------------- port bay (back)
    B = BAY
    face_in = B["face_y"] + B["face_t"]
    def bay_solid(grow):
        zt = B["z1"] + grow
        y_out = -70
        prof = np.array([[B["face_y"] - (0 if grow == 0 else 0), PLATE_T - 5],
                         [B["face_y"], zt], [y_out, zt + (B["face_y"] - y_out)], [y_out, PLATE_T - 5]])
        if grow:
            prof = np.array([[face_in, PLATE_T - 5], [face_in, zt + B["face_t"]],
                             [y_out, zt + B["face_t"] + (face_in - y_out)], [y_out, PLATE_T - 5]])
        cs = m3d.CrossSection([prof[:, [0, 1]]])
        s = m3d.Manifold.extrude(cs, (B["x1"] - B["x0"]) + 2 * grow)
        # (x=y, y=z, z=x) -> world
        s = s.transform(np.array([[0, 0, 1, B["x0"] - grow], [1, 0, 0, 0], [0, 1, 0, 0]], float))
        return s
    bay_open = bay_solid(0)
    bay_walls = (bay_solid(2.0) - bay_open) ^ OUTER ^ slab(PLATE_T, BIG)
    shell = (shell - bay_open) + bay_walls
    px0 = PI_POS[0] - PI["L"] / 2
    pcb_bot = PLATE_T + PI["standoff"]
    port_z = pcb_bot + PI["T"] + 1.4
    if variant == "pi":
        ports = [("pwr", px0 + PI["ports"]["pwr"]), ("usb", px0 + PI["ports"]["usb"])]
        port_cuts = [rrect(12.0, 8.0, 2.5, 20).rotate([90, 0, 0]).translate([x, face_in + 5, port_z]) for _, x in ports]
    else:
        port_cuts = [rrect(12.5, 7.5, 2.5, 20).rotate([90, 0, 0]).translate([(B["x0"] + B["x1"]) / 2, face_in + 5, 11.0])]
    shell = shell - union(port_cuts)

    # ---------------------------------------------------------------- back vents
    V_ = VENT_BACK
    vents = [rrect(V_["w"], V_["z1"] - V_["z0"], V_["w"] / 2 - 0.01, 40).rotate([90, 0, 0])
             .translate([x, Y_SPLIT - 3, (V_["z0"] + V_["z1"]) / 2]) for x in V_["xs"]]
    shell = shell - (union(vents) ^ boxc([-BIG, -BIG, -BIG], [BIG, -25, BIG]))

    # ---------------------------------------------------------------- split into front / back
    front = shell ^ yhalf(True)
    back = shell ^ yhalf(False)

    # alignment lip on the front shell (sits just inside the back shell wall)
    lip_band = g.mesh(np.maximum(sd + WALL + LIP_CLR, -(sd + WALL + LIP_CLR + LIP_T)))
    lip = lip_band ^ boxc([-BIG, Y_SPLIT - LIP_H, 10.0], [BIG, Y_SPLIT + 0.5, 104.0]) ^ g.mesh(np.maximum(sd + WALL + LIP_CLR, roof + 1.5 * LIP_CLR))

    # head screws (horizontal, from the back of the head)
    hs_front, hs_back, hs_cut_f, hs_cut_b = [], [], [], []
    for (x, z) in HEAD_SCREWS:
        sgn = np.sign(x)
        fr_u = (np.array([x, Y_SPLIT + 8.0, z]), np.array([sgn, 0, 0.0]), np.array([0, 0, 1.0]), np.array([0, -sgn, 0.0]))
        # frame with u=±x, v=z, w=-y (right-handed: u x v = w)
        o_ = np.array([x, Y_SPLIT + 8.0, z])
        Uu = np.array([sgn, 0, 0.0]); Vv = np.array([0, 0, 1.0]); Ww = np.cross(Uu, Vv)
        if Ww[1] > 0:   # need w = -y
            Uu = -Uu; Ww = np.cross(Uu, Vv)
        outward = 16.0 * (1 if Uu[0] * sgn > 0 else -1)
        bf = place(teardrop_prism(BOSS_D / 2, 8.0, outward), (o_, Uu, Vv, Ww))
        hs_front.append(bf ^ OUTER)
        o2 = np.array([x, Y_SPLIT, z])
        bb = place(teardrop_prism(BOSS_D / 2, 30.0, outward), (o2, Uu, Vv, Ww))
        hs_back.append(bb ^ OUTER)
        hs_cut_f.append(cyl(9.0, M2_PILOT / 2, seg=20).rotate([90, 0, 0]).translate([x, Y_SPLIT + 8.5, z]))
        hs_cut_b.append(cyl(60, M2_CLEAR / 2, seg=20).rotate([90, 0, 0]).translate([x, Y_SPLIT + 1, z]))
        hs_cut_b.append(cyl(60, M2_HEAD_D / 2, seg=32).rotate([90, 0, 0]).translate([x, Y_SPLIT - 4.0, z]))
    # root of the lip: bridges the 0.25 mm clearance back to the front-shell wall (front side of the split only)
    lip_root = g.mesh(np.maximum(sd + WALL - 0.6, -(sd + WALL + LIP_CLR + LIP_T))) ^ \
        boxc([-BIG, Y_SPLIT, 10.0], [BIG, Y_SPLIT + 2.0, 104.0]) ^ g.mesh(np.maximum(sd + WALL - 0.6, roof + 1.5 * LIP_CLR))
    lip = lip + lip_root
    lip = lip - union([h.translate([0, 0, 0]) for h in hs_front])
    for (x, z) in HEAD_SCREWS:
        Uu = np.array([1.0, 0, 0]); Vv = np.array([0, 0, 1.0]); Ww = np.cross(Uu, Vv)
        lip = lip - place(teardrop_prism(BOSS_D / 2 + 0.6, 12.0, 16.0 * np.sign(x)), (np.array([x, Y_SPLIT + 4, z]), Uu, Vv, Ww))
    lip = lip - union([cyl(30, BOSS_D / 2 + 0.6, seg=32).rotate([90, 0, 0]).translate([x, Y_SPLIT + 10, z]) for (x, z) in HEAD_SCREWS])

    # base-plate screw bosses (vertical)
    def base_boss(x, y):
        o_ = np.array([x, y])
        d = o_ - np.array([0.0, -4.0]); d /= np.linalg.norm(d)
        col = cyl(10.0, BOSS_D / 2, seg=32).translate([x, y, PLATE_T])
        web = cyl(10.0, BOSS_D / 2, seg=32).translate([x + d[0] * 14, y + d[1] * 14, PLATE_T])
        return m3d.Manifold.batch_hull([col, web]) ^ OUTER ^ slab(PLATE_T, BIG)
    bb_front = [base_boss(x, y) for (x, y) in BASE_SCREWS if y > Y_SPLIT]
    bb_back = [base_boss(x, y) for (x, y) in BASE_SCREWS if y <= Y_SPLIT]
    bb_cut = [cyl(9.0, M2_PILOT / 2, seg=20).translate([x, y, PLATE_T - 0.1]) for (x, y) in BASE_SCREWS]

    front = (front + lip + union(hs_front) + union(bb_front)) - union(hs_cut_f + bb_cut)
    # camera-board clearance (0.6 mm), never thinning the skin below 1.0 mm
    v0c = LENS_V - CM3["lens_v"]
    board_clr = to_world(boxc([LENS_U - CM3["w"] / 2 - 0.6, v0c - 0.6, CAM_BACK_W - 3.0],
                              [LENS_U + CM3["w"] / 2 + 0.6, v0c + CM3["h"] + 0.6, CAM_FRONT_W + 0.4]))
    if variant == "pi":
        front = front - (board_clr ^ g.mesh(sd + 1.0))
    back = (back + union(hs_back) + union(bb_back)) - union(hs_cut_b + bb_cut)
    # keep the front-shell head bosses / lip out of the back half & vice versa
    front = front - boxc([-BIG, -BIG, -BIG], [BIG, Y_SPLIT - LIP_H - 0.01, BIG])
    back = back ^ yhalf(False)

    # ---------------------------------------------------------------- base plate
    plate = make_puddle(OUTER)
    rim = (cav_clr - cav_rim) ^ slab(PLATE_T - 0.01, PLATE_T + 2.5)
    keep_out = [bay_solid(2.0 + CLR)]
    keep_out.append(boxc([-SPK["w"] / 2 - 3, SPK_CAGE_Y - SPK["d"] - 3, 0], [SPK["w"] / 2 + 3, 60, 20]))
    if variant == "xiao":
        keep_out.append(boxc([LIPO_POS[0] - LIPO["l"] / 2 - 1, LIPO_POS[1] - LIPO["t"] / 2 - 1, 0], [LIPO_POS[0] + LIPO["l"] / 2 + 1, LIPO_POS[1] + LIPO["t"] / 2 + 1, 30]))
    keep_out.append(boxc([AMP_POS[0] - AMP["w"] / 2 - 4, AMP_POS[1] - 6, 0], [AMP_POS[0] + AMP["w"] / 2 + 4, AMP_POS[1] + 10, 20]))
    keep_out += [cyl(20, BOSS_D / 2 + 0.5, seg=32).translate([x, y, 0]) for (x, y) in BASE_SCREWS]
    keep_out += [m3d.Manifold.batch_hull([cyl(20, BOSS_D / 2 + 0.5, seg=24).translate([x, y, 0]),
                 cyl(20, BOSS_D / 2 + 0.5, seg=24).translate([x * 1.5, (y + 4) * 1.5 - 4, 0])]) for (x, y) in BASE_SCREWS]
    rim = rim - union(keep_out)
    adds, cuts = [rim], []
    if variant == "pi":
        for dx in (-29, 29):
            for dy in (-11.5, 11.5):
                x, y = PI_POS[0] + dx, PI_POS[1] + dy
                adds.append(cyl(PI["standoff"] + 0.01, 2.5, seg=32).translate([x, y, PLATE_T - 0.01]))
                cuts.append(cyl(PI["standoff"] + 1, M2_PILOT / 2, seg=16).translate([x, y, PLATE_T]))
    else:
        # XIAO pedestal right behind the pebble + LiPo pocket
        xc, yc, zt = -LENS_U, 3.0, 28.0
        ped = rrect(XIAO["w"] + 3.4, XIAO["d"] + 3.4, 3, zt - PLATE_T).translate([xc, yc, PLATE_T - 0.01])
        ped = ped - rrect(XIAO["w"] - 4, XIAO["d"] - 4, 2, zt).translate([xc, yc, PLATE_T + 2.0])
        fence = rrect(XIAO["w"] + 0.6 + 3.2, XIAO["d"] + 0.6 + 3.2, 2.5, 4.0) - rrect(XIAO["w"] + 0.6, XIAO["d"] + 0.6, 1.0, 10).translate([0, 0, -1])
        fence = fence - boxc([-30, -30, 0.5], [30, -(XIAO["d"] + 0.6) / 2 + 0.01, 10])  # open toward the back (USB-C)
        adds += [ped, fence.translate([xc, yc, zt - 0.5])]
        # LiPo: flat on the puddle behind the pedestal, held with foam tape (no fence needed)
    # speaker cage (foam-shim the speaker forward against the grille)
    sw, sdp, sh = SPK["w"] + 1.0, SPK["d"] + 1.0, 14.0
    yb = SPK_CAGE_Y - sdp
    cage = boxc([-sw / 2 - 1.6, yb - 1.6, PLATE_T - 0.01], [sw / 2 + 1.6, SPK_CAGE_Y + 4, PLATE_T + sh])
    cage = cage - boxc([-sw / 2, yb, PLATE_T], [sw / 2, SPK_CAGE_Y + 10, PLATE_T + 40])
    cage = cage - boxc([-4, yb - 5, PLATE_T + 3], [4, yb + 1, PLATE_T + 40])   # wire notch
    adds.append(cage ^ cav_clr)
    # amp card slot: the MAX98357A stands upright (pins/wires up), terminal block facing the speaker
    sl_w = AMP["w"] + 0.6
    slot = rrect(sl_w + 5.0, AMP["t"] + 0.4 + 4.0, 1.5, 5.0) - boxc([-sl_w / 2, -(AMP["t"] + 0.4) / 2, 1.2], [sl_w / 2, (AMP["t"] + 0.4) / 2, 10])
    slot = slot - boxc([-sl_w / 2 + 3, -10, 1.2], [sl_w / 2 - 3, 10, 10])   # only the two ends grip; middle open for SMD parts
    adds.append(slot.translate([AMP_POS[0], AMP_POS[1], PLATE_T - 0.01]) ^ cav_clr)
    # vents under the Pi + screw counterbores + bumper-foot locators
    VP = VENT_PLATE
    for x in VP["xs"]:
        cuts.append(rrect(VP["w"], VP["y1"] - VP["y0"], VP["w"] / 2 - 0.01, 20).translate([x, (VP["y0"] + VP["y1"]) / 2, -1]))
    for (x, y) in BASE_SCREWS:
        cuts.append(cyl(20, M2_CLEAR / 2, seg=20).translate([x, y, -1]))
        cuts.append(cyl(M2_HEAD_H + 0.01, M2_HEAD_D / 2, seg=32).translate([x, y, -0.01]))
    plate = (plate + union(adds)) - union(cuts)
    plate = plate - (bay_open ^ slab(PLATE_T, BIG))

    # ---------------------------------------------------------------- pebble, ring, shutter
    def _one(m_):
        return union([c for c in m_.decompose() if c.volume() > 1.0])
    peb_local = _one(make_pebble())
    ring_local = _one(make_ring())
    shut_local = _one(make_shutter())
    pebble = to_world(peb_local)
    ring = to_world(ring_local)
    shutter_closed = to_world(shutter_in_pebble(True))
    shutter_open = to_world(shutter_in_pebble(False))

    def clean(m_, keep_min=30.0):
        comps = [c for c in m_.decompose() if c.volume() > keep_min]
        return union(comps)
    front, back, plate = clean(front, 150.0), clean(back, 150.0), clean(plate)
    parts = dict(front=front, back=back, plate=plate, pebble=pebble, ring=ring, shutter=shutter_open)
    for k, v in parts.items():
        nc = len([c for c in v.decompose() if c.volume() > 1e-3])
        if nc != 1:
            print(f"  WARNING: {k} has {nc} solid bodies")

    # ---------------------------------------------------------------- electronics (for checks/renders)
    elec = {}
    if variant == "pi":
        pcb = boxc([px0, PI_POS[1] - PI["W"] / 2, pcb_bot], [px0 + PI["L"], PI_POS[1] + PI["W"] / 2, pcb_bot + PI["T"]])
        for dx in (-29, 29):
            for dy in (-11.5, 11.5):
                pcb = pcb - cyl(5, PI["hole_d"] / 2, seg=16).translate([PI_POS[0] + dx, PI_POS[1] + dy, pcb_bot - 1])
        comps = boxc([px0 + 6, PI_POS[1] - PI["W"] / 2 + 0.6, pcb_bot + PI["T"]], [px0 + PI["L"] - 6, PI_POS[1] + PI["W"] / 2 - 7.5, pcb_bot + PI["T"] + PI["top_comp"]])
        for nm, off in PI["ports"].items():
            comps = comps + boxc([px0 + off - 4.0, PI_POS[1] - PI["W"] / 2 - 0.6, pcb_bot + PI["T"]], [px0 + off + 4.0, PI_POS[1] - PI["W"] / 2 + 5, pcb_bot + PI["T"] + 3.0])
        hy = PI_POS[1] + PI["W"] / 2 - 3.5
        header = boxc([PI_POS[0] - PI["header_len"] / 2, hy - PI["header_w"] / 2, pcb_bot + PI["T"]],
                      [PI_POS[0] + PI["header_len"] / 2, hy + PI["header_w"] / 2, pcb_bot + PI["T"] + 8.5])
        dupont = boxc([PI_POS[0] - PI["header_len"] / 2, hy - 3.2, pcb_bot + PI["T"] + 8.5 - 6],
                      [PI_POS[0] + PI["header_len"] / 2, hy + 3.2, pcb_bot + PI["T"] + 8.5 - 6 + 14 + 6])
        camconn = boxc([px0 + PI["L"] - 4, PI_POS[1] - 9, pcb_bot + PI["T"]], [px0 + PI["L"] + 0.5, PI_POS[1] + 9, pcb_bot + PI["T"] + 2])
        elec["pi_pcb"] = (pcb, COLORS["pcb"])
        elec["pi_parts"] = (comps + camconn, (150, 150, 150))
        elec["pi_header+duponts"] = (header + dupont, (30, 30, 30))
        board, lens, conn = cm3_model()
        elec["cam3_board"] = (to_world(board), COLORS["pcb"])
        elec["cam3_lens"] = (to_world(lens), (25, 25, 25))
        elec["cam3_fpc_conn"] = (to_world(conn), (200, 200, 200))
    else:
        xc, yc, zt = -LENS_U, 3.0, 28.0
        elec["xiao_sense"] = (boxc([xc - XIAO["w"] / 2, yc - XIAO["d"] / 2, zt + 0.5], [xc + XIAO["w"] / 2, yc + XIAO["d"] / 2, zt + 0.5 + XIAO["h"]]), COLORS["pcb_blue"])
        sq = OV5640_LENS_SQ
        cam = boxc([LENS_U - sq / 2, LENS_V - sq / 2, -10], [LENS_U + sq / 2, LENS_V + sq / 2, -0.3]) + \
            cyl(LENS_FRONT_W + 0.3, 3.75, seg=48).translate([LENS_U, LENS_V, -0.3])
        elec["ov5640"] = (to_world(cam), (25, 25, 25))
        lx, ly = LIPO_POS
        elec["lipo"] = (boxc([lx - LIPO["l"] / 2, ly - LIPO["t"] / 2, PLATE_T + 0.2], [lx + LIPO["l"] / 2, ly + LIPO["t"] / 2, PLATE_T + 0.2 + LIPO["w"]]), (190, 190, 200))
    ab = PLATE_T + 1.3
    elec["amp"] = (boxc([AMP_POS[0] - AMP["w"] / 2, AMP_POS[1] - AMP["t"] / 2, ab], [AMP_POS[0] + AMP["w"] / 2, AMP_POS[1] + AMP["t"] / 2, ab + AMP["d"]])
                   + boxc([AMP_POS[0] - 5, AMP_POS[1] + AMP["t"] / 2, ab + 8.0], [AMP_POS[0] + 5, AMP_POS[1] + AMP["t"] / 2 + 7.5, ab + 16.0]), COLORS["amp"])
    elec["speaker"] = (boxc([-SPK["w"] / 2, SPK_CAGE_Y - SPK["d"], PLATE_T + 0.2], [SPK["w"] / 2, SPK_CAGE_Y, PLATE_T + 0.2 + SPK["h"]]), COLORS["spk"])
    elec["mic_inmp441"] = (place(cyl(MIC["t"] + 1.2, MIC["d"] / 2, seg=48).translate([0, 0, 1.2]), mic_fr), COLORS["mic"])
    elec["led_3mm"] = (to_world(cyl(5.3, 1.5, seg=24).translate([LENS_U, LED_V, -WALL - 5.4])), COLORS["led"])

    info = dict(eyes=[(p.tolist(), n.tolist()) for p, n in eyes], highlights=[h.tolist() for h in highlights], mic=(mp.tolist(), mn.tolist(), t_wall),
                grille=gp.tolist())
    print(f"  build done {time.time() - t_start:.1f}s")
    return parts, elec, info, dict(shutter_closed=shutter_closed, peb_local=peb_local, ring_local=ring_local,
                                    shut_local=shut_local, OUTER=OUTER)


# =============================================================================
# FIT-TEST COUPON (~20-25 min print): the critical internal mounts at true size
# =============================================================================
def make_coupon(variant="pi"):
    """One flat part, printed as exported. Same pilot/clearance sizes as the real parts.
    Pi layout: Pi Zero standoffs + port-bay window wall, Camera Module 3 post tile (posts, lens opening,
    LED hole), speaker cage, INMP441 mic pocket. XIAO layout: XIAO fence, OV5640 socket tile, cage, mic."""
    T = 1.6
    items, cuts = [], []
    # --- Pi footprint frame (or XIAO fence) at origin
    if variant == "pi":
        L, W = PI["L"], PI["W"]
        frame = rrect(L + 6, W + 6, 3, T) - rrect(L - 14, W - 14, 3, 10).translate([0, 0, -1])
        items.append(frame)
        for dx in (-29, 29):
            for dy in (-11.5, 11.5):
                items.append(cyl(PI["standoff"] + T, 2.5, seg=32).translate([dx, dy, 0]))
                cuts.append(cyl(PI["standoff"] + 2, M2_PILOT / 2, seg=16).translate([dx, dy, 0.6]))
        # port-bay face: same gap to the Pi edge, same hole sizes/heights as the real back shell
        gap = -(BAY["face_y"] + BAY["face_t"]) - (-(PI_POS[1] - W / 2))   # face_in vs Pi edge
        y_in = -W / 2 - gap
        wall = boxc([BAY["x0"] - L / 2 + PI_POS[0] + L / 2 - L / 2 + 0.0, y_in - BAY["face_t"], 0],
                    [BAY["x1"], y_in, T + (BAY["z1"] - PLATE_T)])
        wall = boxc([BAY["x0"], y_in - BAY["face_t"], 0], [BAY["x1"], y_in, T + (BAY["z1"] - PLATE_T)])
        items.append(wall + boxc([BAY["x0"], y_in - BAY["face_t"], 0], [BAY["x1"], -W / 2 + 4, T]))
        pz = T + PI["standoff"] + PI["T"] + 1.4
        for nm in ("pwr", "usb"):
            x = -L / 2 + PI["ports"][nm]
            cuts.append(rrect(12.0, 8.0, 2.5, 20).rotate([90, 0, 0]).translate([x, y_in + 5, pz]))
        x_next = L / 2 + 8
    else:
        fw, fd = XIAO["w"] + 0.6, XIAO["d"] + 0.6
        items.append(rrect(fw + 3.2, fd + 3.2, 2.5, T + 4.0) - rrect(fw, fd, 1.0, 10).translate([0, 0, T]))
        x_next = fw / 2 + 10
    # --- camera tile: a 2.4 mm 'belly wall' with the real posts / openings, posts pointing up
    tile_w = 32.0
    cx = x_next + tile_w / 2
    tile = rrect(tile_w, tile_w + 6, 3, WALL).translate([cx, 0, 0])
    v0 = LENS_V - CM3["lens_v"]
    lv = 0.0   # lens centre of the tile
    if variant == "pi":
        plen = -CAM_FRONT_W - WALL
        for hu in (-CM3["hole_dx"] / 2, CM3["hole_dx"] / 2):
            for hv in CM3["holes_v"]:
                px, py = cx + hu, lv + (v0 + hv - LENS_V)
                tile = tile + cyl(WALL + plen, 2.3, seg=32).translate([px, py, 0])
                cuts.append(cyl(WALL + plen + 1, M2_PILOT / 2, seg=16).translate([px, py, 0.6]))
        cuts.append(rrect(CM3["lens_block"] + 2.4, CM3["lens_block"] + 2.4, 2.0, 20).translate([cx, lv, -1]))
    else:
        sq = OV5640_LENS_SQ + 0.4
        tile = tile + rrect(sq + 3.2, sq + 3.2, 1.5, WALL + 8).translate([cx, lv, 0])
        cuts.append(rrect(sq, sq, 0.6, 30).translate([cx, lv, -1]))
    cuts.append(cyl(20, LED_D / 2, seg=24).translate([cx, lv + (LED_V - LENS_V), -1]))
    items.append(tile)
    # --- speaker cage (same inner size), short walls
    sw, sdp = SPK["w"] + 1.0, SPK["d"] + 1.0
    sx0 = cx + tile_w / 2 + 6 + sw / 2 + 1.6
    cage = boxc([sx0 - sw / 2 - 1.6, -sdp / 2 - 1.6, 0], [sx0 + sw / 2 + 1.6, sdp / 2 + 1.6, 8.0]) - \
        boxc([sx0 - sw / 2, -sdp / 2, T], [sx0 + sw / 2, sdp / 2 + 10, 20])
    items.append(cage)
    # --- INMP441 pocket (same diameter) with the 1.5 mm pinhole
    md = MIC["d"] + 0.5
    mx, my = sx0, sdp / 2 + 1.6 + 4 + md / 2 + 1.6
    items.append(cyl(T + 3.0, md / 2 + 1.6, seg=64).translate([mx, my, 0]))
    cuts.append(cyl(10, md / 2, seg=64).translate([mx, my, 1.2]))
    cuts.append(cyl(10, MIC_PIN_D / 2, seg=20).translate([mx, my, -1]))
    x_lo = -PI["L"] / 2 - 2 if variant == "pi" else -XIAO["w"] / 2 - 2
    items.append(boxc([x_lo, -2.0, 0], [mx, 2.0, 1.2]))          # spine: keeps it one part
    items.append(boxc([mx - 2.0, 0, 0], [mx + 2.0, my, 1.2]))
    c = union(items) - union(cuts)
    return to_bed(c)


# =============================================================================
# PAINT GUIDE (preview colours only — the shells print in tan)
# =============================================================================
def paint_colors(V, F, info):
    c = V[F].mean(1)
    X, Y, Z = c[:, 0], c[:, 1], c[:, 2]
    col = np.tile(np.array(COLORS["tan"], float), (len(F), 1))
    face = (sd_ellipsoid(X, Y, Z, (0, 26, G + 76), (33, 20, 15)) < 0) & (Z < G + 88)
    belly = sd_ellipsoid(X, Y, Z, (0, 25, G + 27), (22, 14, 21)) < 0
    limbs = np.zeros(len(F), bool)
    for sx in (1, -1):
        p0, p1 = np.array(ARM["p0"], float), np.array(ARM["p1"], float)
        p0[0] *= sx; p1[0] *= sx
        limbs |= sd_capsule(X, Y, Z, p0, p1, ARM["r0"] + 1.5, ARM["r1"] + 1.5) < 0
        q0, q1 = np.array(LEG["p0"], float), np.array(LEG["p1"], float)
        q0[0] *= sx; q1[0] *= sx
        limbs |= sd_capsule(X, Y, Z, q0, q1, LEG["r"] + 1.0, LEG["r1"] + 1.0) < 0
    cream = (face | belly) & ~limbs & (Y > 6)
    col[cream] = COLORS["cream"]
    col[nose_field(X, Y, Z) < 0.35] = COLORS["dark"]
    raised = outer_field(X, Y, Z) > 0.03          # sculpted add-ons (eye domes, beans) sit proud of the skin
    for (p, n) in info["eyes"]:
        d = c - np.array(p)
        e = (d[:, 0] / (EYE["r"] + 0.4)) ** 2 + (d[:, 2] / (EYE["r"] * 1.06 + 0.4)) ** 2
        col[(e < 1) & (np.abs(d[:, 1]) < 4) & raised] = (35, 28, 26)
    for h in info.get("highlights", []):
        col[(np.linalg.norm(c - np.array(h), axis=1) < 1.35) & raised] = (255, 255, 255)
    for sx in (1, -1):
        fx = sx * SOLE["c"][0]
        sole = (Y > SOLE["c"][1] - 4) & (np.abs(X - fx) < 12) & (np.abs(Z - SOLE["c"][2]) < 12)
        col[sole & raised] = COLORS["pad"]
    # freckles (paint dots) + mouth line
    for sx in (1, -1):
        for (dx, dz) in FRECKLES:
            q = np.array([sx * (MUZZLE["c"][0] - dx), 0, MUZZLE["c"][2] + dz])
            col[(((X - q[0]) ** 2 + (Z - q[2]) ** 2) < 0.9 ** 2) & (Y > 30)] = (150, 110, 85)
    return col


# =============================================================================
# CHECKS
# =============================================================================
def overhang_report(man, thresh_deg=45.0, bed_z=0.4):
    tm = to_trimesh(man)
    n = tm.face_normals
    z = tm.triangles_center[:, 2] - tm.bounds[0, 2]
    lim = -np.cos(np.radians(90 - thresh_deg))   # face pointing down steeper than thresh from vertical
    bad = (n[:, 2] < lim) & (z > bed_z)
    area = tm.area_faces[bad].sum()
    worst = None
    if bad.any():
        pts = tm.triangles_center[bad]
        worst = dict(z_min=float(pts[:, 2].min() - tm.bounds[0, 2]), z_max=float(pts[:, 2].max() - tm.bounds[0, 2]))
    return float(area), worst


def check_mesh(name, man):
    tm = to_trimesh(man)
    return dict(name=name, watertight=bool(tm.is_watertight), winding=bool(tm.is_winding_consistent),
                manifold_status=str(man.status()), genus=int(man.genus()), volume_cm3=round(man.volume() / 1000, 2),
                bbox=[round(float(x), 1) for x in tm.extents], tris=int(man.num_tri()),
                components=len(man.decompose()))


def interference(parts, elec):
    rows = []
    names = list(parts)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            v = (parts[a] ^ parts[b]).volume()
            if v > 0.5:
                rows.append((a, b, round(v, 2)))
    for e, (em, _) in elec.items():
        for p, pm in parts.items():
            v = (em ^ pm).volume()
            if v > 0.05:
                rows.append((e, p, round(v, 2)))
    return rows


# =============================================================================
# OUTPUT
# =============================================================================
PRINT = {  # part key -> (filename, colour name, how to orient for printing)
    "front": ("01_body_front_tan.stl", "tan"),
    "back": ("02_body_back_tan.stl", "tan"),
    "plate": ("03_puddle_base_teal_translucent.stl", "teal translucent"),
    "pebble": ("04_pebble_teal.stl", "teal"),
    "shutter": ("05_shutter_teal.stl", "teal"),
    "ring": ("06_light_ring_white_translucent.stl", "white"),
    "coupon": ("00_fit_test_coupon_any_colour.stl", "any (print FIRST)"),
}


def to_bed(man):
    bb = man.bounding_box()
    lo, hi = np.array(bb[:3]), np.array(bb[3:])
    return man.translate([-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default=VARIANT, choices=["pi", "xiao"])
    ap.add_argument("--no-render", action="store_true")
    args = ap.parse_args()
    from render import render, grid_images

    stl_dir = os.path.join(HERE, "stl") if args.variant == "pi" else os.path.join(HERE, "stl", "variant_xiao")
    rdir = os.path.join(HERE, "renders") if args.variant == "pi" else os.path.join(HERE, "renders", "variant_xiao")
    os.makedirs(stl_dir, exist_ok=True); os.makedirs(rdir, exist_ok=True)
    print(f"building variant={args.variant}")
    parts, elec, info, extra = build(args.variant)

    # ---- print-oriented exports
    print_parts = dict(front=to_bed(parts["front"]), back=to_bed(parts["back"]), plate=to_bed(parts["plate"]),
                       pebble=to_bed(extra["peb_local"]), shutter=to_bed(extra["shut_local"]),
                       ring=to_bed(extra["ring_local"]), coupon=make_coupon(args.variant))
    report = dict(variant=args.variant, parts=[], overhangs={}, interference=[])
    for k, (fn, colr) in PRINT.items():
        if args.variant == "xiao" and k in ("pebble", "shutter", "ring"):
            fn = fn  # identical parts; still written for convenience
        tm = to_trimesh(print_parts[k])
        tm2 = tm.copy()                       # drop zero-area boolean slivers (keeps it watertight)
        tm2.update_faces(tm2.nondegenerate_faces(height=1e-7))
        tm2.remove_unreferenced_vertices()
        if tm2.is_watertight and abs(tm2.volume - tm.volume) < 1e-3 * abs(tm.volume):
            tm = tm2
        tm.export(os.path.join(stl_dir, fn))
        # STL round-trip hardening: re-read as a slicer would (float32, merged by position), rebuild
        # the manifold, collapse any sub-micron slivers, and write again.
        import trimesh as _tr
        _re = _tr.load(os.path.join(stl_dir, fn), process=False)
        _mm = m3d.Mesh(vert_properties=np.asarray(_re.vertices, np.float32), tri_verts=np.asarray(_re.faces, np.uint32))
        _mm.merge()
        _man = m3d.Manifold(_mm)
        if _man.status() == m3d.Error.NoError:
            _man = _man.simplify(0.001)
            to_trimesh(_man).export(os.path.join(stl_dir, fn))
            print_parts[k] = _man
        r = check_mesh(fn, print_parts[k]); r["colour"] = colr
        import trimesh as _tr
        _re = _tr.load(os.path.join(stl_dir, fn))      # re-read the file exactly as a slicer would
        r["stl_reload_watertight"] = bool(_re.is_watertight)
        r["stl_reload_bodies"] = len(_re.split(only_watertight=False))
        report["parts"].append(r)
        report["overhangs"][fn] = overhang_report(print_parts[k])
        print("  ", r, "overhang>45° area mm²:", report["overhangs"][fn])

    # ---- interference
    chk = dict(parts)
    chk["shutter_closed"] = extra["shutter_closed"]
    rows = interference({k: v for k, v in chk.items() if k != "shutter"}, elec)
    rows += interference({"shutter_open": parts["shutter"], **{k: v for k, v in parts.items() if k not in ("shutter",)}}, {})
    report["interference"] = rows
    print("  interference (>0.05 mm³):", rows if rows else "none")
    # does everything electronic sit inside the outer skin?
    outside = {}
    for e, (em, _) in elec.items():
        if e in ("cam3_lens", "ov5640"):
            continue   # the lens sits in the ring aperture by design
        v = (em - (extra["OUTER"] + parts["pebble"] + parts["ring"])).volume()
        if v > 0.05:
            outside[e] = round(v, 2)
    report["electronics_outside_skin"] = outside
    print("  electronics poking outside skin:", outside if outside else "none")
    report["mic"] = info["mic"]
    with open(os.path.join(stl_dir, "check_report.json"), "w") as fh:
        json.dump(report, fh, indent=1)

    if args.no_render:
        return
    # ---- renders
    def tmc(man, colour):
        if man.num_tri() < 400000:
            man = man.refine_to_length(1.5)   # split long boolean slivers (render only)
        tm = to_trimesh(man)
        return (tm.vertices, tm.faces, colour)

    def shell_item(man):
        tm = to_trimesh(man)
        return (tm.vertices, tm.faces, paint_colors(tm.vertices, tm.faces, info))

    def ring_item(man):
        man = man.refine_to_length(1.0)
        tm = to_trimesh(man)
        o_, U_, V_, W_ = PEB_FRAME
        ctr = tm.triangles_center - (o_ + LENS_U * U_ + LENS_V * V_)
        radial = ctr - np.outer(ctr @ W_, W_)
        rr = np.linalg.norm(radial, axis=1)
        col = np.tile(np.array(COLORS["white"], float), (len(tm.faces), 1))
        col[rr < RING_ID / 2 + 0.6] = (45, 45, 48)      # bore blacked with a marker (anti-flare)
        return (tm.vertices, tm.faces, col)

    def peb_item(man, shift=(0, 0, 0)):
        man = man.refine_to_length(1.0)
        tm = to_trimesh(man)
        o_, U_, V_, W_ = PEB_FRAME
        c_ = tm.triangles_center - o_
        uu, vv, ww = c_ @ U_, c_ @ V_, c_ @ W_
        col = np.tile(np.array(COLORS["teal"], float), (len(tm.faces), 1))
        for su in (1, -1):
            d = ((uu - su * PAW["u"]) / PAW["r"][0]) ** 2 + ((vv - PAW["v"]) / PAW["r"][1]) ** 2 + ((ww - PAW["w"]) / PAW["r"][2]) ** 2
            col[d < 1.25] = COLORS["tan"]      # paws are painted tan
        return (tm.vertices + np.asarray(shift), tm.faces, col)

    assembled = [shell_item(parts["front"]), shell_item(parts["back"]), tmc(parts["plate"], COLORS["puddle"]),
                 peb_item(parts["pebble"]), ring_item(parts["ring"]),
                 tmc(parts["shutter"], COLORS["teal"])]
    # ---- assembled, painted model for viewing (not for printing)
    import trimesh as _trg
    _sc = _trg.Scene()
    for _i, (_v, _f, _c) in enumerate(assembled):
        _m = _trg.Trimesh(vertices=_v, faces=_f, process=False)
        _cc = np.asarray(_c, float)
        _cc = np.tile(_cc, (len(_f), 1)) if _cc.ndim == 1 else _cc
        _m.visual.face_colors = np.hstack([_cc[:, :3], np.full((len(_f), 1), 255)]).astype(np.uint8)
        _sc.add_geometry(_m, node_name=f"part{_i}")
    _sc.export(os.path.join(outdir_base if 'outdir_base' in dir() else os.path.dirname(stl_dir), "otter_assembled.glb"))
    print("wrote otter_assembled.glb")
    if os.environ.get("GLB_ONLY"):
        return
    views = [("front", 0, 6), ("three_quarter", 38, 14), ("side", 90, 4), ("back", 180, 12), ("top", 20, 70)]
    paths = []
    for nm, az, el in views:
        pth = os.path.join(rdir, f"{nm}.png")
        render(assembled, pth, az=az, el=el, title=f"Ayin otter — {nm}")
        paths.append(pth)
    # closed-shutter view
    closed = assembled[:-1] + [tmc(extra["shutter_closed"], COLORS["teal"])]
    pth = os.path.join(rdir, "front_shutter_closed.png")
    render(closed, pth, az=20, el=6, title="privacy shutter closed")
    paths.append(pth)
    grid_images(paths, os.path.join(rdir, "overview_sheet.png"), cols=3)
    # side-by-side with the team's reference art (bottom-left seated otter)
    ref = os.path.join(HERE, "reference_cute_otter.png")
    if os.path.exists(ref):
        from PIL import Image
        mine = os.path.join(rdir, "_cmp_view.png")
        render(assembled, mine, az=14, el=8, size=700, title="Ayin otter (this design)")
        r = Image.open(ref).convert("RGB")
        crop = r.crop((40, 470, 420, 870))
        crop = crop.resize((int(700 * crop.width / crop.height), 700))
        bgc = Image.new("RGB", crop.size, (246, 244, 239))
        crop = Image.composite(crop, bgc, Image.fromarray((np.asarray(crop).sum(2) > 40).astype(np.uint8) * 255))
        sheet = Image.new("RGB", (700 + crop.width, 700), (246, 244, 239))
        sheet.paste(Image.open(mine), (0, 0)); sheet.paste(crop, (700, 0))
        sheet.save(os.path.join(rdir, "compare_reference.png"))
        os.remove(mine)

    # exploded with electronics
    ax = np.array([0, np.cos(np.radians(CAM_TILT)), -np.sin(np.radians(CAM_TILT))])
    ex = [shell_item(parts["front"])]
    tb = to_trimesh(parts["back"].translate([0, -60, 0])); ex.append((tb.vertices, tb.faces, paint_colors(tb.vertices, tb.faces, info)))
    ex.append(tmc(parts["plate"].translate([0, 0, -45]), COLORS["puddle"]))
    ex.append(peb_item(parts["pebble"], ax * 40))
    ex.append(tmc(parts["ring"].translate(list(ax * 25)), COLORS["white"]))
    ex.append(tmc(parts["shutter"].translate(list(ax * 55)), COLORS["teal"]))
    for e, (em, colr) in elec.items():
        shift = [0, 0, -45] if (e.startswith("pi") or e in ("amp", "speaker", "lipo", "xiao_sense")) else [0, 0, 0]
        if e.startswith("cam") or e in ("ov5640", "led_3mm"):
            shift = list(ax * 10)
        ex.append(tmc(em.translate(shift), colr))
    render(ex, os.path.join(rdir, "exploded.png"), az=55, el=18, size=1100, title="exploded (electronics as blocks)")
    # electronics only, in place, with the base plate
    el_items = [tmc(parts["plate"], COLORS["puddle"])] + [tmc(em, colr) for (em, colr) in elec.values()] + \
               [peb_item(parts["pebble"]), tmc(parts["ring"], COLORS["white"])]
    render(el_items, os.path.join(rdir, "internals_layout.png"), az=150, el=35, size=1000,
           title="internal layout (shells hidden)")
    # sections
    for nm, normal, off, az, el in [("section_side_through_lens", [-1, 0, 0], LENS_U, 90, 2),
                                    ("section_side_through_mic", [1, 0, 0], info["mic"][0][0] - 14, -90, 2),
                                    ("section_front_through_pi", [0, 1, 0], PI_POS[1] if args.variant == 'pi' else -15, 180, 4)]:
        cut = []
        for k in ("front", "back", "plate"):
            m_ = parts[k].trim_by_plane(normal, off)
            if not m_.is_empty():
                tm = to_trimesh(m_)
                cut.append((tm.vertices, tm.faces, COLORS["puddle"] if k == "plate" else paint_colors(tm.vertices, tm.faces, info)))
        for k, colr in (("pebble", COLORS["teal"]), ("ring", COLORS["white"]), ("shutter", COLORS["teal"])):
            m_ = parts[k].trim_by_plane(normal, off)
            if not m_.is_empty():
                cut.append(tmc(m_, colr))
        for e, (em, colr) in elec.items():
            cut.append(tmc(em, colr))
        render(cut, os.path.join(rdir, f"{nm}.png"), az=az, el=el, size=1000, title=nm.replace("_", " "))
    # print layout preview (each part in print orientation)
    lay, xoff = [], 0.0
    for k in ("front", "back", "plate", "pebble", "shutter", "ring", "coupon"):
        m_ = print_parts[k]
        bb = m_.bounding_box()
        w = bb[3] - bb[0]
        m_ = m_.translate([xoff - bb[0], 0, 0]); xoff += w + 8
        lay.append(tmc(m_, COLORS["teal"] if k in ("pebble", "shutter") else COLORS["white"] if k == "ring" else COLORS["puddle"] if k == "plate" else COLORS["tan"]))
    render(lay, os.path.join(rdir, "print_orientation.png"), az=20, el=25, size=1400, title="print orientation (as exported)")
    print("renders ->", rdir)


if __name__ == "__main__":
    main()
