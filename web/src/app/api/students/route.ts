import { listStudents } from "@/lib/data/crew";

export async function GET() {
  return Response.json({ students: await listStudents() });
}
