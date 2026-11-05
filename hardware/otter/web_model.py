"""Make a light, painted model of the assembled otter for the landing page's 3D viewer.

    GLB_ONLY=1 .venv/bin/python otter.py    # writes otter_assembled.glb (about 30 MB)
    .venv/bin/python web_model.py           # writes otter_web.glb (about 3.5 MB)

Each part is simplified to a few tens of thousands of triangles, and its paint colours are
copied back from the full-detail mesh. Then compress it into the landing page:

    npx @gltf-transform/cli optimize otter_web.glb ../../landing/public/device/otter.glb \
        --compress meshopt --simplify false --texture-compress false
"""
import os

import numpy as np
import trimesh
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "otter_assembled.glb")
OUT = os.path.join(HERE, "otter_web.glb")

# Triangles to keep per part, in the order otter.py adds them.
TARGETS = {
    "front shell": 90000,
    "back shell": 40000,
    "puddle base": 16000,
    "pebble": 16000,
    "light ring": None,  # already small
    "shutter": None,
}


def linear(rgba):
    """glTF reads vertex colours as linear light, but the paint colours are sRGB. Convert them."""
    c = rgba[:, :3] / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return np.hstack([np.round(lin * 255), rgba[:, 3:]]).astype(np.uint8)


def simplify(mesh, target):
    if target is None or len(mesh.faces) <= target:
        return mesh
    small = mesh.simplify_quadric_decimation(face_count=target)
    # The paint is per vertex; take each new vertex's colour from the nearest original vertex.
    _, nearest = cKDTree(mesh.vertices).query(small.vertices)
    small.visual = trimesh.visual.ColorVisuals(small, vertex_colors=mesh.visual.vertex_colors[nearest])
    return small


def main():
    scene = trimesh.load(SRC)
    out = trimesh.Scene()
    parts = sorted(scene.geometry.items(), key=lambda kv: int(kv[0].rsplit("_", 1)[-1]))
    for (name, target), (_, geom) in zip(TARGETS.items(), parts):
        part = simplify(geom, target)
        part.visual = trimesh.visual.ColorVisuals(part, vertex_colors=linear(np.asarray(part.visual.vertex_colors)))
        print(f"  {name}: {len(geom.faces)} -> {len(part.faces)} triangles")
        out.add_geometry(part, node_name=name.replace(" ", "_"))
    out.export(OUT)
    print(f"wrote {os.path.relpath(OUT)} ({os.path.getsize(OUT) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
