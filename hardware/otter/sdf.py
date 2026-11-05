"""Small implicit-modelling + meshing helpers used by otter.py.

Organic outer shapes are built as smooth-unioned implicit fields, meshed with
marching cubes, and then handed to manifold3d for exact boolean work (cuts,
holes, bosses). manifold3d guarantees watertight / manifold output.
"""
import numpy as np
import manifold3d as m3d
from skimage.measure import marching_cubes
from scipy import ndimage


# ----------------------------------------------------------------- fields
def smin(a, b, k):
    """Polynomial smooth minimum (smooth union). k = blend radius in mm."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sd_ellipsoid(X, Y, Z, c, r):
    px, py, pz = (X - c[0]) / r[0], (Y - c[1]) / r[1], (Z - c[2]) / r[2]
    k0 = np.sqrt(px * px + py * py + pz * pz)
    qx, qy, qz = px / r[0], py / r[1], pz / r[2]
    k1 = np.sqrt(qx * qx + qy * qy + qz * qz) + 1e-9
    return k0 * (k0 - 1.0) / k1


def sd_superseat(X, Y, Z, c, a, b, rz, n):
    """Rounded-box-like 'bean bag' blob: superellipse (exp n) in XY, ellipse in Z.
    Approximate distance (scaled by the smallest radius)."""
    rxy = (np.abs((X - c[0]) / a) ** n + np.abs((Y - c[1]) / b) ** n) ** (1.0 / n)
    q = np.sqrt(rxy ** 2 + ((Z - c[2]) / rz) ** 2)
    return (q - 1.0) * min(a, b, rz)


def sd_capsule(X, Y, Z, p0, p1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ba = p1 - p0
    bb = ba @ ba
    pax, pay, paz = X - p0[0], Y - p0[1], Z - p0[2]
    h = np.clip((pax * ba[0] + pay * ba[1] + paz * ba[2]) / bb, 0, 1)
    dx, dy, dz = pax - ba[0] * h, pay - ba[1] * h, paz - ba[2] * h
    return np.sqrt(dx * dx + dy * dy + dz * dz) - (r0 + (r1 - r0) * h)


# ----------------------------------------------------------------- meshing
class Grid:
    def __init__(self, lo, hi, res):
        self.lo = np.array(lo, float)
        self.res = res
        self.n = np.ceil((np.array(hi, float) - self.lo) / res).astype(int) + 1
        xs = [self.lo[i] + np.arange(self.n[i]) * res for i in range(3)]
        self.axes = xs
        self.X, self.Y, self.Z = np.meshgrid(*xs, indexing="ij", sparse=True)

    def mesh(self, field, level=0.0):
        """Mesh {field < level} into a manifold3d.Manifold."""
        f = np.array(field, dtype=np.float32)
        # force closed surfaces at the grid border
        f[0, :, :] = f[-1, :, :] = 1e3
        f[:, 0, :] = f[:, -1, :] = 1e3
        f[:, :, 0] = f[:, :, -1] = 1e3
        v, t, _, _ = marching_cubes(f, level=level, spacing=(self.res,) * 3,
                                    gradient_direction="ascent", allow_degenerate=False)
        v = v + self.lo
        return mesh_to_manifold(v, t)

    def signed_edt(self, inside):
        """Euclidean signed distance (mm) of a boolean occupancy, negative inside."""
        din = ndimage.distance_transform_edt(inside) * self.res
        dout = ndimage.distance_transform_edt(~inside) * self.res
        return np.where(inside, -din + 0.5 * self.res, dout - 0.5 * self.res).astype(np.float32)


def mesh_to_manifold(v, t):
    mesh = m3d.Mesh(vert_properties=np.ascontiguousarray(v, dtype=np.float32),
                    tri_verts=np.ascontiguousarray(t, dtype=np.uint32))
    mesh.merge()
    man = m3d.Manifold(mesh)
    if man.status() != m3d.Error.NoError:
        raise RuntimeError(f"mesh not manifold: {man.status()}")
    if man.volume() < 0:
        mesh = m3d.Mesh(vert_properties=np.ascontiguousarray(v, dtype=np.float32),
                        tri_verts=np.ascontiguousarray(t[:, ::-1], dtype=np.uint32))
        man = m3d.Manifold(mesh)
    return man


def to_trimesh(man):
    import trimesh
    mm = man.to_mesh()
    return trimesh.Trimesh(np.asarray(mm.vert_properties)[:, :3], np.asarray(mm.tri_verts), process=False)


# ----------------------------------------------------------------- solids
def frame(origin, w):
    """Orthonormal frame (u, v, w) with w along the given axis, u ~ +X."""
    w = np.asarray(w, float); w /= np.linalg.norm(w)
    u = np.array([1.0, 0, 0]) - w * w[0]
    if np.linalg.norm(u) < 1e-6:
        u = np.array([0, 1.0, 0]) - w * w[1]
    u /= np.linalg.norm(u)
    v = np.cross(w, u)
    return np.asarray(origin, float), u, v, w


def place(man, fr):
    """Map a solid modelled in local (u,v,w)=(x,y,z) coords into frame fr."""
    o, u, v, w = fr
    M = np.column_stack([u, v, w, o])  # 3x4
    return man.transform(M)


def cyl(h, r, r2=None, center=False, seg=48):
    return m3d.Manifold.cylinder(h, r, r if r2 is None else r2, seg, center)


def box(sx, sy, sz, center=True):
    return m3d.Manifold.cube([sx, sy, sz], center)


def boxc(lo, hi):
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    return m3d.Manifold.cube(list(hi - lo), False).translate(list(lo))


def union(items):
    items = [i for i in items if i is not None and not i.is_empty()]
    if not items:
        return m3d.Manifold()
    return m3d.Manifold.batch_boolean(items, m3d.OpType.Add)


def rrect(w, h, r, thick, seg=24):
    """Rounded rectangle plate centred on origin in XY, extruded +Z by thick."""
    r = min(r, w / 2 - 1e-3, h / 2 - 1e-3)
    pts = []
    for cx, cy, a0 in [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                       (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]:
        for a in np.linspace(a0, a0 + 90, seg // 4 + 1):
            pts.append([cx + r * np.cos(np.radians(a)), cy + r * np.sin(np.radians(a))])
    cs = m3d.CrossSection([np.array(pts)])
    return m3d.Manifold.extrude(cs, thick)


def ellipse_prism(a, b, thick, seg=96):
    t = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    cs = m3d.CrossSection([np.column_stack([a * np.cos(t), b * np.sin(t)])])
    return m3d.Manifold.extrude(cs, thick)


def superellipse_prism(a, b, n, thick, seg=128):
    t = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    c, s = np.cos(t), np.sin(t)
    x = a * np.sign(c) * np.abs(c) ** (2 / n)
    y = b * np.sign(s) * np.abs(s) ** (2 / n)
    cs = m3d.CrossSection([np.column_stack([x, y])])
    return m3d.Manifold.extrude(cs, thick)
