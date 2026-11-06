"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
export const THEME_KEY = "ayin-theme";

// The theme lives on <html data-theme>, set before paint by the script in layout.tsx.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const current = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light") as Theme;

/** A round button that switches between Otto's light pond and its dark evening pond. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing can block storage; the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-line bg-card text-ink transition-transform hover:rotate-12"
    >
      {theme === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
