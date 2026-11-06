import { networkInterfaces } from "node:os";

/**
 * This computer's addresses on the Wi-Fi, so the app can show a QR code a phone on the same
 * network can scan to open Otto. Only private addresses are listed.
 */
export function GET() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
  return Response.json({ addresses });
}
