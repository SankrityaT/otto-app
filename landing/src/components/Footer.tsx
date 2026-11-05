import { NAV, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line px-5 pb-12 pt-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-[40px] leading-none">Ayin</p>
          <p className="mt-3 max-w-sm text-ink-2">A calm otter coach for big tasks, one small step at a time.</p>
          <p className="mt-6 font-hand text-[19px] text-ink-3">No otters were rushed in the making of this page.</p>
        </div>
        <nav aria-label="Footer">
          <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-3">On this page</p>
          <ul className="mt-3 grid gap-2">
            {NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-ink-2 hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-ink-3">More</p>
          <ul className="mt-3 grid gap-2">
            <li>
              <a href={site.appUrl} className="text-ink-2 hover:text-ink">
                Try Ayin
              </a>
            </li>
            <li>
              <a href={site.githubUrl} className="text-ink-2 hover:text-ink">
                Source code
              </a>
            </li>
            {site.contactEmail && (
              <li>
                <a href={`mailto:${site.contactEmail}`} className="text-ink-2 hover:text-ink">
                  Contact
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap justify-between gap-3 border-t border-line pt-6 text-[14px] text-ink-3">
        <p>Made for the 2026 North American AI Challenge for Neurodiverse Learning.</p>
        <p>© 2026 Ayin · MIT licensed</p>
      </div>
    </footer>
  );
}
