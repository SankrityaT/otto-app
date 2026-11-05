// The colour maths is Havi's, from web/src/components/pond/FurSlider.tsx, shared by the
// colour picker and the raft so an otter's fur and its ring always match.

/** The painted fur, as HSV: hue 30°, a soft brown. Hue shifts rotate from here. */
const FUR = { h: 30, s: 0.32, v: 0.78 };

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/** The fur colour for a given hue shift, as the otter shows it. */
export function furColor(shift: number) {
  return hsvToHex((FUR.h + shift) % 360, FUR.s, FUR.v);
}

/** The same hue a little richer, so a ring reads clearly against the card. */
export function ringColor(shift: number) {
  return hsvToHex((FUR.h + shift) % 360, 0.46, 0.76);
}

/** Plain words for the colour, read out by screen readers. */
export function furName(shift: number) {
  if (shift === 0) return "Natural brown";
  const h = (FUR.h + shift) % 360;
  const names: [number, string][] = [
    [15, "Rose"], [45, "Caramel"], [70, "Honey"], [100, "Olive"], [150, "Sage"],
    [190, "Seafoam"], [230, "Sky"], [265, "Periwinkle"], [300, "Lilac"], [335, "Mauve"], [360, "Rose"],
  ];
  return names.find(([max]) => h < max)![1];
}

/** The slider track: every colour the fur can be. */
export const FUR_STOPS = Array.from({ length: 13 }, (_, i) => `${furColor(i * 30)} ${((i / 12) * 100).toFixed(1)}%`).join(", ");
