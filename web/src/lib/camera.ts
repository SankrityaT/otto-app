import type { Photo } from "./ai/client";
import { config } from "./config";
import { getSetting } from "./data/settings";

/** Where the otter is: the address saved during "Connect your otter", or else AYIN_CAMERA_URL. */
export async function otterAddress(): Promise<string | null> {
  return (await getSetting("otter_url")) ?? config.cameraUrl;
}

// Otto doesn't care which camera a photo comes from: the phone sends one with the
// request, or the server takes one from the otter. Either way the answer is the same.
// Photos are only used for the one request and are never saved.

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

/** Turn a browser "data:image/jpeg;base64,..." string into a Photo. */
export function photoFromDataUrl(dataUrl: string): Photo | null {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1] as Photo["mediaType"], data: match[2] };
}

/** Take a photo from the otter's camera (XIAO or Raspberry Pi), which serves GET /capture. */
export async function photoFromOtter(at?: string): Promise<Photo | null> {
  const address = at ?? (await otterAddress());
  if (!address) return null;
  const response = await fetch(`${address.replace(/\/$/, "")}/capture`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return { mediaType: "image/jpeg", data: bytes.toString("base64") };
}

/** The photo for this request: the one the browser sent, or else one from the otter. */
export async function getPhoto(dataUrl: unknown): Promise<Photo | null> {
  if (typeof dataUrl === "string") return photoFromDataUrl(dataUrl);
  return photoFromOtter();
}
