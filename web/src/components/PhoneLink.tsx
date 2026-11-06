"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * "Use Otto on your phone": a QR code the phone's camera can scan to open Otto on this Wi-Fi,
 * already set to this student. Nothing to type.
 */
export function PhoneLink({ studentId }: { studentId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/connect")
      .then((r) => r.json())
      .then(async ({ addresses }: { addresses: string[] }) => {
        const { protocol, port, hostname } = window.location;
        // If this page was opened by its Wi-Fi address already, use that; otherwise use the computer's.
        const host = hostname === "localhost" || hostname === "127.0.0.1" ? addresses[0] : hostname;
        if (!host) return;
        const link = `${protocol}//${host}${port ? `:${port}` : ""}/app?student=${encodeURIComponent(studentId)}`;
        setUrl(link);
        setQr(await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#1f1c18", light: "#fffcf7" } }));
      })
      .catch(() => {});
  }, [studentId]);

  if (!qr || !url) return null;
  const secure = url.startsWith("https://");

  return (
    <section className="card flex flex-col items-center gap-3 text-center">
      <h2 className="text-[18px] font-bold">Use Otto on your phone</h2>
      <p className="text-[16px] text-ink-2">Open your phone&apos;s camera and point it at this code. Otto opens, ready for you.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- a QR code made in the browser */}
      <img src={qr} alt={`QR code to open Otto on a phone: ${url}`} className="w-52 rounded-xl" />
      {!secure && (
        <p className="text-[14px] text-ink-3">
          For the phone&apos;s camera to work, start Otto with <code>npm run dev:phone</code> so it uses https.
        </p>
      )}
    </section>
  );
}
