"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCameraChoice } from "@/lib/client/settings";
import Tabs from "./pond/Tabs";

const SECTIONS: ["/" | "/crew" | "/me", string][] = [
  ["/", "Today"],
  ["/crew", "Crew"],
  ["/me", "Me"],
];

/** The frame around the main screens: a quiet status line on top, the section tabs below. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [camera] = useCameraChoice();
  const current = SECTIONS.find(([path]) => path === pathname)?.[0] ?? "/";

  return (
    <div className="app">
      <header className="status" aria-label="Status">
        <span className="status__day">Ayin</span>
        <span className="status__right">
          <span className="pill">
            <span className="pill__dot pill__dot--off" aria-hidden />
            {camera === "otter" ? "Using the otter's camera" : camera === "screen" ? "Looking at a shared screen" : "Using this phone's camera"}
          </span>
        </span>
      </header>
      <main className="main">{children}</main>
      <Tabs items={SECTIONS} value={current} onChange={(path) => router.push(path)} />
    </div>
  );
}
