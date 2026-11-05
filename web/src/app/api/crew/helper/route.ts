import type { NextRequest } from "next/server";
import { helperFor } from "@/lib/data/crew";

/** The raftmate who has done this step on their own most often, to ask for help. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return Response.json({ helperName: await helperFor(params.get("studentId") ?? "", params.get("stepId") ?? "") });
}
