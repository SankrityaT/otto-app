import { photoFromOtter } from "@/lib/camera";
import { findOtter } from "@/lib/findOtter";
import { jsonError } from "@/lib/http";

/** Look for an otter on the Wi-Fi, and send back its address and a photo through it. */
export async function POST() {
  const address = await findOtter();
  if (!address) return jsonError("No otter found yet. Check it's plugged in and on the same Wi-Fi, then try again.", 404);
  const photo = await photoFromOtter(address).catch(() => null);
  return Response.json({ address, photo: photo ? `data:${photo.mediaType};base64,${photo.data}` : null });
}
