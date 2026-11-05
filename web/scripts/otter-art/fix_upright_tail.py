"""Rebuild the upright otter's tail layer so the whole tail sways as one piece.

In the original layers, only the middle of the tail was in upright-tail.png; its tip and the
strip along the floor were painted into upright-body.png. When the middle swayed it pulled
away from both, and the cut edges had a dark fringe from upscaling, so the tail looked like
three pieces. This moves every tail pixel right of the body into the tail layer, heals the
old cuts, and recolours the dark fringe from the fur next to it.

    python scripts/fix_upright_tail.py    # needs numpy, scipy and pillow; run once, on the original layers

The tail now swings from its root at the hip, so UprightOtter's TAIL_PIVOT moved to match.
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
OTTER = os.path.join(HERE, "..", "..", "public", "landing", "otter")

# In the 2048 px art: where the tail's tip and floor strip are in the body layer.
TIP = {"x": 1495, "y": (1000, 1450)}  # the tail tip, painted into the body layer
STRIP_Y = (1615, 1705)
STUB_X = 1440  # the tail strip starts under the leg here
FADE = (1468, 1490)  # the body's stub fades out across this range, over the moving tail
# Under the hip the tail overlaps the body, so no gap opens when it sways. That overlap must not
# reach above the point where the tail's inner edge meets the body, or it pokes out.
HIP_TAB = {"x": 1500, "y": 1490}


def load(name):
    return np.asarray(Image.open(os.path.join(OTTER, name)).convert("RGBA")).astype(np.float64) / 255


def over(top, bottom):
    a = top[..., 3:] + bottom[..., 3:] * (1 - top[..., 3:])
    rgb = (top[..., :3] * top[..., 3:] + bottom[..., :3] * bottom[..., 3:] * (1 - top[..., 3:])) / np.maximum(a, 1e-6)
    return np.concatenate([rgb, a], axis=-1)


def defringe(img, region):
    """Give soft edge pixels the colour of the nearest solid pixel, so edges fade out instead of going dark."""
    solid = img[..., 3] > 0.98
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    soft = region & (img[..., 3] > 0) & ~solid
    img[soft, :3] = img[iy[soft], ix[soft], :3]
    return img


def main():
    tail, body = load("upright-tail.png"), load("upright-body.png")
    h, w = body.shape[:2]
    y, x = np.mgrid[0:h, 0:w]

    # Every body pixel right of the body's edge is tail; so is the floor strip back to under the leg.
    strip = (y >= STRIP_Y[0]) & (y <= STRIP_Y[1]) & (x >= STUB_X)
    tip = (x >= TIP["x"]) & (y >= TIP["y"][0]) & (y < TIP["y"][1])
    take = tip | strip
    part = body.copy()
    part[~take, 3] = 0
    whole = over(tail, part)

    # Heal the old cuts: thin dips in coverage inside the tail are filled from the fur beside them.
    a = whole[..., 3]
    closed = ndimage.grey_closing(a, size=(11, 11))
    seam = (closed - a > 0.08) & (x >= STUB_X)
    whole[seam, 3] = closed[seam]
    whole = defringe(whole, x >= STUB_X - 20)
    # The old cuts also left thin lines, darker or lighter than the fur on both sides. Repaint them
    # from the fur around them. (The tail's own shading changes slowly, so it is left alone.)
    whole[..., 3] = np.where(whole[..., 3] > 0.9, np.maximum(whole[..., 3], closed), whole[..., 3])
    inside = ndimage.binary_erosion(whole[..., 3] > 0.9, iterations=4)
    lum = whole[..., :3] @ np.array([0.299, 0.587, 0.114])
    smooth = np.stack([ndimage.median_filter(whole[..., c], size=15) for c in range(3)], axis=-1)
    line = inside & (np.abs(lum - smooth @ np.array([0.299, 0.587, 0.114])) > 0.03)
    line = ndimage.binary_dilation(line, iterations=2) & inside
    whole[line, :3] = smooth[line]
    # Stray dark, white and yellow pixels where the old cut met the edge: the fur here has none.
    lum = whole[..., :3] @ np.array([0.299, 0.587, 0.114])
    r, g, b = whole[..., 0], whole[..., 1], whole[..., 2]
    odd = (lum < 0.45) | (lum > 0.85) | (g > r) | (b < 0.5 * r)
    stray = (whole[..., 3] > 0) & odd & (x >= STUB_X - 20)
    ok = (whole[..., 3] > 0.9) & ~stray
    _, (iy, ix) = ndimage.distance_transform_edt(~ok, return_indices=True)
    whole[stray, :3] = whole[iy[stray], ix[stray], :3]
    whole[(x < HIP_TAB["x"]) & (y < HIP_TAB["y"]), 3] = 0
    # The healing must not grow the tail outside its drawing.
    outside = ndimage.binary_dilation(a > 0.02, iterations=2)
    whole[~outside, 3] = 0

    # The body keeps the leg and a short stub of tail under the hip, fading out over the moving tail.
    fade = np.clip((FADE[1] - x) / (FADE[1] - FADE[0]), 0, 1)
    body[..., 3] = np.where(strip, body[..., 3] * fade, np.where(tip, 0, body[..., 3]))
    body = defringe(body, (x >= 1300) & (y >= 1550))

    for name, img in (("upright-tail.png", whole), ("upright-body.png", body)):
        Image.fromarray(np.round(img * 255).astype(np.uint8), "RGBA").save(os.path.join(OTTER, name), optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main()
