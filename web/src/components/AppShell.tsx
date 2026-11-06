"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCameraChoice } from "@/lib/client/settings";
import Tabs from "./pond/Tabs";

const SECTIONS: ["/app" | "/app/raft" | "/app/me", string][] = [
  ["/app", "Today"],
  ["/app/raft", "Raft"],
  ["/app/me", "Me"],
];

/** The frame around the main screens: a quiet status line on top, the section tabs below. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [camera] = useCameraChoice();
  // Pages inside a section (a raft post, a profile) keep that section's tab lit.
  const current = SECTIONS.find(([path]) => path !== "/app" && pathname.startsWith(path))?.[0] ?? "/app";

  return (
    <div className="app">
      <header className="status" aria-label="Status">
        <span className="status__day flex items-center gap-2.5 text-[20px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Havi's otter logo, a small fixed icon */}
          <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          Otto
        </span>
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
