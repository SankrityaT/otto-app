import { asset, NAV, site } from "@/landing/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ground/85 backdrop-blur-md">
      <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8" aria-label="Main">
        <a href="#top" className="flex items-center gap-2.5 rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static icon */}
          <img src={asset("/otter/otter-base.png")} alt="" width={40} height={40} className="-my-1 size-11 object-contain" />
          <span className="font-display text-[30px] leading-none">Ayin</span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="rounded-full px-3.5 py-2 text-[16px] text-ink-2 transition-colors hover:bg-clay hover:text-ink">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2.5">
          <a href={site.appUrl} className="btn btn--primary btn--small">
            Try Ayin
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
