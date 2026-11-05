import type { ButtonHTMLAttributes } from "react";

type Look = "main" | "soft" | "quiet";

const LOOKS: Record<Look, string> = {
  // The one action we expect next: dark ink capsule.
  main: "bg-ink text-card hover:bg-ink-2",
  // A second choice: clay capsule.
  soft: "bg-clay text-ink hover:bg-clay-2",
  // A way out: plain words.
  quiet: "bg-transparent text-ink-2 underline-offset-4 hover:underline",
};

export function Button({
  look = "soft",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { look?: Look }) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[17px] font-medium transition-colors disabled:opacity-40 ${LOOKS[look]} ${className}`}
      {...props}
    />
  );
}
