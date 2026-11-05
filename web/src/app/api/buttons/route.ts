import type { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { isButton, pressesAfter, recordPress } from "@/lib/data/buttons";
import { jsonError, readJson } from "@/lib/http";

/** The otter reports a button press. */
export async function POST(request: NextRequest) {
  if (config.deviceToken && request.headers.get("x-device-token") !== config.deviceToken) {
    return jsonError("Unknown device.", 401);
  }
  const { button } = await readJson(request);
  if (!isButton(button)) return jsonError("Unknown button.", 400);
  recordPress(button);
  return Response.json({ ok: true }, { status: 201 });
}

/** The screen asks for presses it hasn't seen yet. */
export function GET(request: NextRequest) {
  const after = Number(request.nextUrl.searchParams.get("after") ?? 0);
  return Response.json({ presses: pressesAfter(Number.isFinite(after) ? after : 0) });
}
