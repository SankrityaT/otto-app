import type { NextRequest } from "next/server";
import { crewView } from "@/lib/data/crew";
import { jsonError } from "@/lib/http";

export function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  const crew = crewView(studentId);
  if (!crew) return jsonError("This student isn't in a crew yet.", 404);
  return Response.json({ crew });
}
