/** "just now", "12 min ago", "today", "yesterday" or a weekday: plain words, no timestamps. */
export function whenWords(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return "today";
  if (minutes < 60 * 48) return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
}
