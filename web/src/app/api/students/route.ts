import { listStudents } from "@/lib/data/crew";

export function GET() {
  return Response.json({ students: listStudents() });
}
