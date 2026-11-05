"""Redraw the upright otter's closed eyes to match the floating otter's.

The upright closed-eyes layer had thick, tilted lines. This keeps its fur, smoothly fills in
the old lines, and makes a separate lash layer (upright-lash.png) with the floating otter's thin
closed-eye stroke: taken from its fully closed blink frame (otter-eyelids.png), levelled, and
scaled to the upright otter's eyes, mirrored for the left eye so both match. UprightOtter moves the
lash down with the eyelid as it closes.

    python scripts/redraw_closed_eyes.py    # needs numpy, scipy and pillow; run once

It prints the eyelid travel and the lash's resting height, for LID and LASH_Y in UprightOtter.tsx.
"""
import math
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OTTER = os.path.join(HERE, "..", "..", "public", "landing", "otter")
UP_EYES = ((650, 790, 950, 1000), (1050, 790, 1300, 1000))  # boxes around each upright eye (2048 px art)
RIM = 20  # the light ring and outline around each upright eye, covered too
FRAMES = 11  # otter-eyelids.png: 11 blink frames, open to closed, stacked


def load(name):
    return np.asarray(Image.open(os.path.join(OTTER, name)).convert("RGBA")).astype(np.float64) / 255


def lum(img):
    return img[..., :3] @ np.array([0.299, 0.587, 0.114])


def blobs(img, box=None, thresh=0.25, min_px=200):
    """Dark shapes (eyes, strokes) as (mask, bbox) pairs, biggest first."""
    l, t = (box[0], box[1]) if box else (0, 0)
    patch = img[box[1] : box[3], box[0] : box[2]] if box else img
    dark = (lum(patch) < thresh) & (patch[..., 3] > 0.5)
    labels, n = ndimage.label(dark)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(labels == k)
        if len(xs) >= min_px:
            out.append((xs + l, ys + t))
    return sorted(out, key=lambda p: -len(p[0]))


def main():
    body = load("upright-body.png")
    sheet = load("otter-eyelids.png")
    fh = sheet.shape[0] // FRAMES
    open_f, shut_f = sheet[:fh], sheet[(FRAMES - 1) * fh :]

    # The floating otter: its open right eye, and the closed stroke drawn over it.
    # The eyes are near black; the nose is a lighter brown, so a strict threshold leaves it out.
    eyes_open = sorted(blobs(open_f, thresh=0.12)[:2], key=lambda p: p[0].mean())
    r_eye = eyes_open[-1]
    r_centre = np.array([r_eye[0].mean(), r_eye[1].mean()])
    strokes = blobs(shut_f, thresh=0.3, min_px=150)
    stroke = min(strokes, key=lambda p: np.hypot(p[0].mean() - r_centre[0], p[1].mean() - r_centre[1]))
    sx, sy = stroke
    # Level the stroke by its two ends, so it sits straight across the face.
    left_end = (sx.min(), sy[sx == sx.min()].mean())
    right_end = (sx.max(), sy[sx == sx.max()].mean())
    angle = math.degrees(math.atan2(right_end[1] - left_end[1], right_end[0] - left_end[0]))

    pad = 12
    l, t, r, b = sx.min() - pad, sy.min() - pad, sx.max() + pad, sy.max() + pad
    crop = shut_f[t:b, l:r]
    cl = lum(crop)
    fur, ink = np.percentile(cl, 85), np.percentile(cl, 2)
    mask = np.clip((fur - cl) / (fur - ink), 0, 1) * crop[..., 3]
    # Keep only the stroke itself: faint fur shading elsewhere in the crop would turn into lines.
    shapes, _ = ndimage.label(mask > 0.3)
    biggest = 1 + np.argmax(ndimage.sum(mask > 0.3, shapes, range(1, shapes.max() + 1)))
    mask *= ndimage.binary_dilation(shapes == biggest, iterations=3)
    ink_colour = np.median(crop[mask > 0.85, :3], axis=0)
    # Where the stroke sits on its eye, with the floating otter's head tilt taken out.
    drop = (np.array([(l + r) / 2, (t + b) / 2]) - r_centre)
    a = math.radians(-angle)
    drop_y = drop[0] * math.sin(a) + drop[1] * math.cos(a)

    # The upright otter's eyes.
    up = []
    for box in UP_EYES:
        xs, ys = blobs(body, box)[0]
        up.append({"cx": xs.mean(), "cy": ys.mean(), "w": xs.max() - xs.min(), "h": ys.max() - ys.min(), "top": ys.min(), "bottom": ys.max()})
    scale = np.mean([e["w"] for e in up]) / (r_eye[0].max() - r_eye[0].min())

    m = Image.fromarray(np.round(mask * 255).astype(np.uint8), "L").rotate(angle, resample=Image.BICUBIC, expand=True)
    m = m.resize((round(m.width * scale), round(m.height * scale)), Image.LANCZOS)
    stroke_mask = np.asarray(m).astype(np.float64) / 255

    # Work on the closed eyes as they look over the body. The old thick lines, and the bottom of each
    # open eye they were hiding, are dark; fill those in smoothly from the fur and cream around them
    # (a harmonic fill: every filled pixel ends up the average of its neighbours).
    lids = load("upright-eyes.png")
    seen = np.concatenate([lids[..., :3] * lids[..., 3:] + body[..., :3] * (1 - lids[..., 3:]), np.ones_like(lids[..., 3:])], axis=-1)
    # What to fill: every dark shape that touches an eye (the old lines, all of them, and any of the
    # open eye showing), plus the thin edge of Havi's patch next to each eye, where the eye's rim
    # shows through. The nose touches neither eye, so it is left alone.
    h, w = body.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    around = np.zeros((h, w), bool)
    for e in up:
        around |= ((xx - e["cx"]) / (e["w"] / 2 + RIM)) ** 2 + ((yy - e["cy"]) / (e["h"] / 2 + RIM)) ** 2 < 1
    shapes, n = ndimage.label(lum(seen) < 0.45)
    touching = np.unique(shapes[around & (shapes > 0)])
    dark = np.isin(shapes, touching) | (around & (lids[..., 3] < 0.97))
    # The old lines have a soft, blurry halo; reach past it so the fill starts from clean fur and cream.
    dark = ndimage.binary_dilation(dark, iterations=14)
    ys, xs = np.nonzero(dark)
    t, b, l, r = ys.min() - 12, ys.max() + 12, xs.min() - 12, xs.max() + 12
    box, inside = seen[t:b, l:r], dark[t:b, l:r]
    for _ in range(4000):
        avg = (np.roll(box, 1, 0) + np.roll(box, -1, 0) + np.roll(box, 1, 1) + np.roll(box, -1, 1)) / 4
        box[inside] = avg[inside]
    # The layer keeps Havi's soft fur patch, grown just enough to cover what was filled in.
    grown = ndimage.gaussian_filter(ndimage.binary_dilation(dark, iterations=3).astype(float), 3)
    layer = np.concatenate([seen[..., :3], np.maximum(lids[..., 3], np.clip(grown * 1.6, 0, 1))[..., None]], axis=-1)

    # The new strokes, on their own layer, centred on each eye where the floating otter's sits on its own.
    lash = np.zeros_like(layer)
    for e, flip in ((up[1], False), (up[0], True)):
        mk = stroke_mask[:, ::-1] if flip else stroke_mask
        mh, mw = mk.shape
        x0, y0 = round(e["cx"] - mw / 2), round(e["cy"] + drop_y * scale - mh / 2)
        region = lash[y0 : y0 + mh, x0 : x0 + mw]
        region[..., :3] = ink_colour
        region[..., 3] = np.maximum(region[..., 3], mk)

    for name, img in (("upright-eyes.png", layer), ("upright-lash.png", lash)):
        Image.fromarray(np.round(img * 255).astype(np.uint8), "RGBA").save(os.path.join(OTTER, name), optimize=True)
    top = min(e["top"] for e in up) - 6
    # The lid travels to the bottom of this layer, so nothing in it is ever cut off by the lid's edge.
    rows = np.nonzero((layer[..., 3] > 0.02).any(axis=1))[0]
    bottom = rows.max()
    print(f"stroke levelled by {angle:.1f}°, scaled {scale:.2f}x, {stroke_mask.shape[1]}x{stroke_mask.shape[0]} px")
    lash_y = np.mean([e["cy"] for e in up]) + drop_y * scale
    print(f"LID = {{ top: {math.floor(top / 2)}, bottom: {math.ceil(bottom / 2)} }}, LASH_Y = {round(lash_y / 2)}  (1024 px space)")


if __name__ == "__main__":
    main()
