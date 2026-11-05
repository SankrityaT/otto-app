import { otterAddress } from "@/lib/camera";
import { setSetting } from "@/lib/data/settings";
import { jsonError, readJson } from "@/lib/http";

/** The otter Ayin is connected to, if any. */
export function GET() {
  return Response.json({ address: otterAddress() });
}

/** Save the otter's address after it passes the test, or forget it with null. */
export async function POST(request: Request) {
  const { address } = await readJson(request);
  if (address !== null && (typeof address !== "string" || !/^https?:\/\/\S+$/.test(address))) {
    return jsonError("That doesn't look like an otter address. It starts with http://", 400);
  }
  setSetting("otter_url", address);
  return Response.json({ ok: true });
}
