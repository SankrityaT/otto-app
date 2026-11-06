"""Give the upright otter the same eyebrows as the floating one.

Lifts the right eyebrow from Havi's floating otter (otter-base.png), levels it (that otter's
head is tilted), scales it to the upright otter's larger eyes, and paints it above each eye,
mirrored for the left one. It goes on the body and on the closed-eyes layer, so the brows
stay put while the otter blinks.

    python scripts/otter-art/add_upright_eyebrows.py    # needs numpy, scipy and pillow; run once
"""
import math
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OTTER = os.path.join(HERE, "..", "..", "public", "otter")

# In the floating otter's 2048 px art.
SRC_BROW = (895, 755, 1005, 815)  # left, top, right, bottom: around the right eyebrow
SRC_EYES = ((600, 880), (972, 882))  # rough centres, to find each eye
# In the upright otter's art.
UP_EYES = ((650, 790, 950, 1000), (1050, 790, 1300, 1000))  # boxes around each eye
# The upright eyes are rounder and set wider, so the brows come in a touch smaller and closer.
SIZE, LIFT = 0.88, 0.8


def load(name):
    return np.asarray(Image.open(os.path.join(OTTER, name)).convert("RGBA")).astype(np.float64) / 255


def lum(img):
    return img[..., :3] @ np.array([0.299, 0.587, 0.114])


def eye(img, box):
    """Centre and width of the dark eye inside a box."""
    l, t, r, b = box
    patch = img[t:b, l:r]
    dark = (lum(patch) < 0.25) & (patch[..., 3] > 0.8)
    labels, n = ndimage.label(dark)
    biggest = 1 + np.argmax(ndimage.sum(dark, labels, range(1, n + 1)))
    ys, xs = np.nonzero(labels == biggest)
    return np.array([xs.mean() + l, ys.mean() + t]), xs.max() - xs.min()


def main():
    base = load("otter-base.png")
    body, eyes = load("upright-body.png"), load("upright-eyes.png")

    # The floating otter's eyes: how tilted its head is, and how big an eye is.
    (lc, lw), (rc, rw) = (eye(base, (c[0] - 90, c[1] - 90, c[0] + 90, c[1] + 90)) for c in SRC_EYES)
    tilt = math.degrees(math.atan2(rc[1] - lc[1], rc[0] - lc[0]))

    # The brow as a soft mask: how much darker than the fur around it each pixel is.
    l, t, r, b = SRC_BROW
    patch = base[t:b, l:r]
    pl = lum(patch)
    fur, ink = np.percentile(pl, 90), np.percentile(pl, 3)
    mask = np.clip((fur - pl) / (fur - ink), 0, 1) * patch[..., 3]
    mask[mask < 0.08] = 0
    colour = np.median(patch[mask > 0.8, :3], axis=0)
    brow_offset = np.array([(l + r) / 2, (t + b) / 2]) - rc  # where the brow sits from its eye

    # Level it and scale it to the upright otter's eyes.
    (ulc, ulw), (urc, urw) = (eye(body, box) for box in UP_EYES)
    scale = ((ulw + urw) / 2) / ((lw + rw) / 2) * SIZE
    m = Image.fromarray(np.round(mask * 255).astype(np.uint8), "L")
    m = m.rotate(tilt, resample=Image.BICUBIC, expand=True)
    m = m.resize((round(m.width * scale), round(m.height * scale)), Image.LANCZOS)
    brow = np.asarray(m).astype(np.float64) / 255
    # The offset turns with the head and grows with the eye. Brows sit straight above level eyes.
    a = math.radians(-tilt)
    off = np.array([brow_offset[0] * math.cos(a) - brow_offset[1] * math.sin(a), brow_offset[0] * math.sin(a) + brow_offset[1] * math.cos(a)]) * scale
    dy = off[1] / SIZE * LIFT

    for img in (body, eyes):
        for centre, flip in ((urc, False), (ulc, True)):
            mk = brow[:, ::-1] if flip else brow
            h, w = mk.shape
            cx, cy = centre[0], centre[1] + dy
            x0, y0 = round(cx - w / 2), round(cy - h / 2)
            region = img[y0 : y0 + h, x0 : x0 + w]
            # Only paint onto fur that is already there, so the brows never float past the layer's edge.
            alpha = (mk * (region[..., 3] > 0.05))[..., None]
            region[..., :3] = region[..., :3] * (1 - alpha) + colour * alpha
    print(f"head tilt {tilt:.1f}°, scale {scale:.2f}, brow {brow.shape[1]}x{brow.shape[0]} px, {abs(dy):.0f} px above each eye")

    for name, img in (("upright-body.png", body), ("upright-eyes.png", eyes)):
        Image.fromarray(np.round(img * 255).astype(np.uint8), "RGBA").save(os.path.join(OTTER, name), optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main()
