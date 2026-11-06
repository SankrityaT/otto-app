import type { ReactNode } from "react";

/** A little speech bubble in the otter's handwriting. */
export function OtterSays({ children, className = "", tailX }: { children: ReactNode; className?: string; tailX?: string }) {
  return (
    <span className={`bubble ${className}`} style={tailX ? { ["--tail-x" as string]: tailX } : undefined}>
      {children}
    </span>
  );
}
