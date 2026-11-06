import type { NextRequest } from "next/server";
import { crewView } from "@/lib/data/crew";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  const crew = await crewView(studentId);
  if (!crew) return jsonError("You're not in a raft yet.", 404);
  return Response.json({ crew });
}
