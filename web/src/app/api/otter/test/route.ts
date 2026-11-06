import { photoFromOtter } from "@/lib/camera";
import { jsonError, readJson } from "@/lib/http";

/** Try an otter address: take one photo through it and send it back so the student sees it work. */
export async function POST(request: Request) {
  const { address } = await readJson(request);
  if (typeof address !== "string" || !/^https?:\/\/\S+$/.test(address)) {
    return jsonError("Type the address your otter shows. It starts with http://", 400);
  }
  try {
    const photo = await photoFromOtter(address);
    if (!photo) return jsonError("The otter answered, but sent no photo. Check its camera cable.", 502);
    return Response.json({ photo: `data:${photo.mediaType};base64,${photo.data}` });
  } catch {
    return jsonError("Otto couldn't reach the otter. Check it's on and on the same Wi-Fi.", 502);
  }
}
