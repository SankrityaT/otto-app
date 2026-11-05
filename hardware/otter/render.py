"""Tiny dependency-light offscreen renderer (numpy z-buffer point splatting).

No OpenGL needed: each triangle is densely sampled with barycentric points,
projected orthographically, z-buffered, Lambert shaded, then outlined where
depth jumps. Good enough for design previews.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _basis(az, el):
    az, el = np.radians(az), np.radians(el)
    # direction from target toward the camera
    d = np.array([np.sin(az) * np.cos(el), np.cos(az) * np.cos(el), np.sin(el)])
    up0 = np.array([0, 0, 1.0])
    right = np.cross(up0, d)
    if np.linalg.norm(right) < 1e-6:
        right = np.array([1.0, 0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(d, right)
    return d, right, up


def render(items, path, az=0, el=15, size=900, ss=2, bg=(246, 244, 239), title=None,
           span=None, center=None, light=(-0.4, 0.8, 0.9)):
    """items: list of (V, F, color) where color is (r,g,b) 0-255 or an (nF,3) array.
    az=0 looks at the model's front (+Y faces the camera)."""
    d, right, up = _basis(az, el)
    allV = np.vstack([it[0] for it in items])
    if center is None:
        center = (allV.min(0) + allV.max(0)) / 2
    P = allV - center
    sx, sy = P @ right, P @ up
    if span is None:
        span = max(np.ptp(sx), np.ptp(sy)) * 1.12
    W = size * ss
    scale = W / span
    # key light from the viewer's upper-left so every view (incl. back) is evenly lit
    L = d * 0.75 + up * 0.55 - right * 0.35
    L /= np.linalg.norm(L)

    pts_ix, pts_depth, pts_col = [], [], []
    for V, F, col in items:
        V = np.asarray(V, float) - center
        F = np.asarray(F)
        a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
        n = np.cross(b - a, c - a)
        nn = np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        n = n / nn
        facing = (n @ d)
        if np.ndim(col) == 1 or (np.ndim(col) == 2 and len(col) != len(F)):
            col = np.tile(np.asarray(col, float)[None, :3], (len(F), 1))
        col = np.asarray(col, float)
        ns = np.where(facing[:, None] < 0, -n, n)  # two-sided for section views
        diff = np.clip(ns @ L, 0, 1)
        rim = (1 - np.abs(facing)) ** 3
        shade = 0.50 + 0.50 * diff
        fc = col * shade[:, None] + 40 * rim[:, None]
        fc = np.where(facing[:, None] < 0, fc * 0.55, fc)  # inside surfaces darker
        # projected area -> samples
        pa = np.stack([a @ right, a @ up], 1) * scale
        pb = np.stack([b @ right, b @ up], 1) * scale
        pc = np.stack([c @ right, c @ up], 1) * scale
        area = 0.5 * np.abs((pb[:, 0] - pa[:, 0]) * (pc[:, 1] - pa[:, 1]) -
                            (pc[:, 0] - pa[:, 0]) * (pb[:, 1] - pa[:, 1]))
        emax = np.max(np.stack([np.linalg.norm(pb - pa, axis=1), np.linalg.norm(pc - pb, axis=1),
                                np.linalg.norm(pa - pc, axis=1)]), axis=0)
        k = np.clip(np.ceil(np.maximum(np.sqrt(area * 8.0), emax * 0.8)).astype(int), 1, 240)
        for kk in np.unique(k):
            sel = np.nonzero(k == kk)[0]
            # barycentric lattice with kk subdivisions
            ii, jj = np.meshgrid(np.arange(kk + 1), np.arange(kk + 1), indexing="ij")
            m = ii + jj <= kk
            u = (ii[m] / kk) if kk > 0 else np.array([1 / 3])
            vv = (jj[m] / kk) if kk > 0 else np.array([1 / 3])
            u = u * 0.98 + 0.01; vv = vv * 0.98 + 0.01
            w = 1 - u - vv
            A, B, C = a[sel], b[sel], c[sel]
            p = (A[:, None, :] * w[None, :, None] + B[:, None, :] * u[None, :, None] +
                 C[:, None, :] * vv[None, :, None]).reshape(-1, 3)
            xs = (p @ right) * scale + W / 2
            ys = W / 2 - (p @ up) * scale
            dep = -(p @ d)
            ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < W)
            ix = ys.astype(int) * W + xs.astype(int)
            pts_ix.append(ix[ok]); pts_depth.append(dep[ok])
            pts_col.append(np.repeat(fc[sel], len(u), axis=0)[ok])
    ix = np.concatenate(pts_ix); dep = np.concatenate(pts_depth); colr = np.concatenate(pts_col)
    order = np.lexsort((dep, ix))
    ix, dep, colr = ix[order], dep[order], colr[order]
    first = np.ones(len(ix), bool); first[1:] = ix[1:] != ix[:-1]
    img = np.empty((W * W, 3)); img[:] = bg
    zb = np.full(W * W, np.inf)
    img[ix[first]] = colr[first]; zb[ix[first]] = dep[first]
    img = img.reshape(W, W, 3); zb = zb.reshape(W, W)
    # fill pinholes (pixels with no sample surrounded by geometry)
    hole = ~np.isfinite(zb)
    for _ in range(2):
        nb = [np.roll(img, s, ax) for s in (1, -1) for ax in (0, 1)]
        nz = [np.roll(zb, s, ax) for s in (1, -1) for ax in (0, 1)]
        cnt = sum(np.isfinite(z) for z in nz)
        fill = hole & (cnt >= 2)
        if fill.any():
            acc = sum(np.where(np.isfinite(z)[..., None], c, 0) for c, z in zip(nb, nz))
            img[fill] = (acc / np.maximum(cnt, 1)[..., None])[fill]
            zb[fill] = np.nanmin(np.where(np.isfinite(np.stack(nz)), np.stack(nz), np.inf), 0)[fill]
            hole = ~np.isfinite(zb)
    # outlines on depth discontinuities
    zf = np.where(np.isfinite(zb), zb, 1e6)
    g = np.maximum(np.abs(np.diff(zf, axis=0, prepend=zf[:1])), np.abs(np.diff(zf, axis=1, prepend=zf[:, :1])))
    edge = g > 4.0
    img[edge] = img[edge] * 0.35 + np.array([60, 45, 40]) * 0.65 * 0.4
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)
    if title:
        dr = ImageDraw.Draw(im)
        try:
            f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        except Exception:
            f = ImageFont.load_default()
        dr.text((16, 12), title, fill=(70, 60, 55), font=f)
        dr.text((16, size - 32), f"scale: frame width = {span:.0f} mm", fill=(120, 110, 100), font=f)
    im.save(path)
    return span, center


def grid_images(paths, out, cols=3):
    ims = [Image.open(p) for p in paths]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (w * cols, h * rows), (246, 244, 239))
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    sheet.save(out)
