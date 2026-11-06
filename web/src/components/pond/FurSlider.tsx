'use client';

/*
 * Written by Havi (@Havishea) for the Otto team, from https://github.com/Havishea/Otto.
 * Unchanged.
 */
/** The painted fur, as HSV: hue 30°, a soft brown. Hue shifts rotate from here. */
const FUR = { h: 30, s: 0.32, v: 0.78 };

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/** The fur colour for a given shift, as the otter will show it. */
export function furColor(shift: number) {
  return hsvToHex((FUR.h + shift) % 360, FUR.s, FUR.v);
}

/** Plain words for the colour, read out by screen readers. */
export function furName(shift: number) {
  if (shift === 0) return 'Natural brown';
  const h = (FUR.h + shift) % 360;
  const names: [number, string][] = [
    [15, 'Rose'], [45, 'Caramel'], [70, 'Honey'], [100, 'Olive'], [150, 'Sage'],
    [190, 'Seafoam'], [230, 'Sky'], [265, 'Periwinkle'], [300, 'Lilac'], [335, 'Mauve'], [360, 'Rose'],
  ];
  return names.find(([max]) => h < max)![1];
}

const STOPS = Array.from({ length: 13 }, (_, i) => `${furColor(i * 30)} ${((i / 12) * 100).toFixed(1)}%`).join(', ');

type Props = { value: number; onChange: (shift: number) => void };

/** A spectrum slider for the otter's fur. 0 is the painted brown. */
export default function FurSlider({ value, onChange }: Props) {
  return (
    <div className="fur">
      <div className="fur__row">
        <label htmlFor="fur-hue" className="fur__label">Fur colour</label>
        <span className="fur__value">
          <span className="fur__swatch" style={{ background: furColor(value) }} aria-hidden />
          {furName(value)}
        </span>
      </div>
      <input
        id="fur-hue"
        className="fur__range"
        type="range"
        min={0}
        max={359}
        step={1}
        value={value}
        aria-valuetext={furName(value)}
        style={{ ['--track' as string]: `linear-gradient(90deg, ${STOPS})`, ['--thumb' as string]: furColor(value) }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="fur__foot">
        <p className="choice__help">Only the fur changes. The otter moves and looks the same in every other way.</p>
        {value !== 0 && (
          <button className="btn btn--text" onClick={() => onChange(0)}>Back to natural</button>
        )}
      </div>
    </div>
  );
}
