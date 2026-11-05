import type { NextRequest } from "next/server";
import { feed, type PostKind } from "@/lib/data/raft";

/** The raft's posts: wins, help asks, or both. */
export function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  const kind = request.nextUrl.searchParams.get("kind");
  return Response.json({ posts: feed(studentId, kind === "win" || kind === "ask" ? (kind as PostKind) : null) });
}
