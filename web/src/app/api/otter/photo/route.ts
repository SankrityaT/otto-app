import { photoFromOtter } from "@/lib/camera";

/** What the otter's camera sees right now, so the student can always see what Otto sees. */
export async function GET() {
  const photo = await photoFromOtter().catch(() => null);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": photo.mediaType, "Cache-Control": "no-store" },
  });
}
