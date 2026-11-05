/** One of Havi's pond leaves, in any colour. */
export function Leaf({ color, className = "", style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 48 48" aria-hidden>
      <path d="M7 41C6 25 14 9 41 6c2 19-9 34-34 35z" fill={color} />
      <path
        d="M8 40C17 30 25 21 37 10M17 31l-1-8M24 24l7 1M24 24l-1-8M17 31l7 1"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
