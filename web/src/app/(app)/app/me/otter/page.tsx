"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { api } from "@/lib/client/api";
import { useCameraChoice } from "@/lib/client/settings";

type Step = "power" | "find" | "buttons" | "done";
const STEPS: Step[] = ["power", "find", "buttons", "done"];

/** How often to check for a button press while testing the buttons. */
const PRESS_POLL_MS = 800;

/**
 * "Connect your otter": turn it on, find it on the Wi-Fi, see a real photo through it,
 * try its buttons, and make it Otto's eyes. No files to edit.
 */
export default function ConnectOtter() {
  const [, setCamera] = useCameraChoice();
  const [step, setStep] = useState<Step>("power");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    api.otter().then((r) => r.address && setAddress(r.address));
  }, []);

  // While on the buttons step, wait for a press on the otter.
  useEffect(() => {
    if (step !== "buttons" || pressed) return;
    let lastId = -1;
    const timer = setInterval(async () => {
      const { presses } = await api.buttonPresses(Math.max(lastId, 0)).catch(() => ({ presses: [] }));
      if (presses.length === 0) return;
      if (lastId !== -1) setPressed(true);
      lastId = presses[presses.length - 1].id;
    }, PRESS_POLL_MS);
    return () => clearInterval(timer);
  }, [step, pressed]);

  /** Search the Wi-Fi for the otter. */
  async function find() {
    setTesting(true);
    setMessage(null);
    try {
      const found = await api.findOtter();
      setAddress(found.address);
      if (found.photo) setPhoto(found.photo);
      else setMessage("Found your otter, but its camera sent no photo. Check the camera cable.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function test() {
    setTesting(true);
    setMessage(null);
    setPhoto(null);
    try {
      setPhoto((await api.testOtter(address.trim())).photo);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function finish() {
    await api.saveOtter(address.trim());
    setCamera("otter");
    setStep("done");
  }

  return (
    <AppShell>
      <div className="page flex flex-col gap-6 pb-10">
        <Link href="/me" className="btn btn--text self-start px-0">
          Back
        </Link>
        <ol className="flex gap-2" aria-label={`Step ${STEPS.indexOf(step) + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= STEPS.indexOf(step) ? "bg-cel-deep" : "bg-clay"}`} />
          ))}
        </ol>

        {step === "power" && (
          <>
            <h1 className="page__h">Connect your otter</h1>
            <Image src="/otter/device.png" alt="The Otto otter" width={640} height={640} className="mx-auto w-64" priority />
            <p className="text-[18px] text-ink-2">
              Plug your otter in and put it at your work station, about an arm&apos;s length from where you work. The pebble it holds is
              its camera.
            </p>
            <p className="text-[18px] text-ink-2">Make sure this phone and the otter are on the same Wi-Fi.</p>
            <Button look="main" className="h-14" onClick={() => setStep("find")}>
              It&apos;s on
            </Button>
          </>
        )}

        {step === "find" && (
          <>
            <h1 className="page__h">Find your otter</h1>
            <p className="text-[18px] text-ink-2">Otto looks for your otter on your Wi-Fi. This takes a few seconds.</p>
            {!photo && (
              <Button look="main" className="h-14" disabled={testing} onClick={find}>
                {testing ? "Looking for your otter" : "Find my otter"}
              </Button>
            )}
            {message && <p className="rounded-2xl bg-card p-4 text-[17px]">{message}</p>}
            {photo && (
              <>
                <p className="text-[18px] font-semibold text-cel-deep">Found it! This is what your otter sees:</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- a live photo from the otter, not saved */}
                <img src={photo} alt="A photo from the otter's camera" className="w-full rounded-2xl" />
                <Button look="main" className="h-14" onClick={() => setStep("buttons")}>
                  That looks right
                </Button>
              </>
            )}
            {typing ? (
              <div className="flex flex-col gap-3">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="http://192.168.1.50"
                  inputMode="url"
                  aria-label="Otter address"
                  className="h-14 rounded-2xl border border-line bg-card px-4 text-[18px]"
                />
                <Button disabled={testing || !address.trim()} onClick={test}>
                  Try this address
                </Button>
              </div>
            ) : (
              <button onClick={() => setTyping(true)} className="btn btn--text self-center">
                Type the address instead (for staff)
              </button>
            )}
          </>
        )}

        {step === "buttons" && (
          <>
            <h1 className="page__h">Try the buttons</h1>
            <p className="text-[18px] text-ink-2">
              The Raspberry Pi otter has three buttons: Done, Help and Show me. They work like the buttons on screen, so you never have
              to talk to use Otto.
            </p>
            <p className={`rounded-2xl p-4 text-center text-[19px] font-semibold ${pressed ? "bg-cel-wash text-cel-deep" : "bg-card"}`} aria-live="polite">
              {pressed ? "Got it! Your otter's buttons work." : "Press any button on your otter"}
            </p>
            <Button look="main" className="h-14" onClick={finish}>
              {pressed ? "Next" : "My otter has no buttons"}
            </Button>
          </>
        )}

        {step === "done" && (
          <>
            <h1 className="page__h">Your otter is ready</h1>
            <Image src="/otter/device.png" alt="" width={640} height={640} className="mx-auto w-48" />
            <p className="text-[18px] text-ink-2">
              Otto now looks through your otter when you tap Done, Help or Show me. You can switch back to this phone any time in Me.
            </p>
            <Link href="/" className="btn btn--primary text-center">
              Start a task
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
