/** A weekly ring, from 0 (empty) to 1 (full). It only ever fills; it never shows a loss. */
export function Ring({
  fill,
  size = 64,
  stroke = 6,
  label,
  color = "var(--color-cel-deep)",
}: {
  fill: number;
  size?: number;
  stroke?: number;
  label?: string;
  /** The ring's colour; a student's ring matches their otter's fur. */
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-clay)" strokeWidth={stroke} />
      {fill > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * fill} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}
