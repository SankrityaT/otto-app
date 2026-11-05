import { listStations } from "@/lib/data/routines";

/** Every task as a station in the raft's room, with its small 3D model if there is one. */
export function GET() {
  return Response.json({ stations: listStations() });
}
