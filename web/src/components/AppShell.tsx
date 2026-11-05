"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCameraChoice } from "@/lib/client/settings";
import Tabs from "./pond/Tabs";

const SECTIONS: ["/" | "/raft" | "/me", string][] = [
  ["/", "Today"],
  ["/raft", "Raft"],
  ["/me", "Me"],
];

/** The frame around the main screens: a quiet status line on top, the section tabs below. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [camera] = useCameraChoice();
  // Pages inside a section (a raft post, a profile) keep that section's tab lit.
  const current = SECTIONS.find(([path]) => path !== "/" && pathname.startsWith(path))?.[0] ?? "/";

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
      {/* Room at the bottom so the floating tabs never cover the last button on a page. */}
      <div className="h-32 shrink-0" aria-hidden />
      <Tabs items={SECTIONS} value={current} onChange={(path) => router.push(path)} />
    </div>
  );
}
