# Otter artwork

Drawn by Havi (@Havishea) for Otto. The original layers were 1024 px. To keep the otter sharp on
high-density phone screens, we upscaled each layer 4× with Real-ESRGAN (the anime illustration
model, run locally) and saved it at 2048 px. The layout of every sheet is unchanged, so the animation
code reads them the same way.

| File | What it is |
| --- | --- |
| `otter-base.png` | The floating otter in the pond |
| `otter-eyelids.png` | 11 blink frames, stacked |
| `otter-tail.png` | The pond without the tail, and the tail on its own |
| `upright-body.png`, `upright-tail.png`, `upright-eyes.png`, `upright-lash.png` | The sitting-up otter, in layers |
| `device.png` | The desk otter, for the "Connect your otter" screen |

## Small fixes to the layers

Three one-off scripts in [`web/scripts/otter-art/`](../../scripts/otter-art/) adjusted the sitting-up otter so it matches the floating one. Each explains itself at the top of the file:

- `add_upright_eyebrows.py` gives it the floating otter's eyebrows.
- `fix_upright_tail.py` moves the whole tail into its own layer, so it sways as one piece.
- `redraw_closed_eyes.py` redraws its closed eyes and adds the thin lash layer.
