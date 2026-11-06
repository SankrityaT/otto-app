import { networkInterfaces } from "node:os";

// Finds an Ayin otter on the same Wi-Fi without anyone typing an address. Each otter answers
// GET /hello with {"ayin": "otter"}. First try its name, then every address on the network.

const NAMES = ["http://ayin-otter.local", "http://ayin-otter.local:8080"];
const PORTS = [80, 8080];
const TIMEOUT_MS = 1200;

async function isOtter(address: string): Promise<boolean> {
  try {
    const response = await fetch(`${address}/hello`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) return false;
    const body = (await response.json()) as { ayin?: string };
    return body.ayin === "otter";
  } catch {
    return false;
  }
}

/** Biggest network we'll search, so a large office network doesn't mean thousands of checks. */
const MAX_HOSTS = 1024;

const toNumber = (ip: string) => ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
const toIp = (n: number) => [24, 16, 8, 0].map((shift) => Math.floor(n / 2 ** shift) % 256).join(".");

/** Every address on this computer's local Wi-Fi or wired network, worked out from its netmask. */
function localAddresses(): string[] {
  const addresses: string[] = [];
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      const size = 2 ** 32 - toNumber(net.netmask);
      if (size > MAX_HOSTS) continue;
      const first = toNumber(net.address) - (toNumber(net.address) % size);
      for (let host = 1; host < size - 1; host++) addresses.push(toIp(first + host));
    }
  }
  return addresses;
}

/** The first otter found, or null. Checks names first, then the whole network at once. */
export async function findOtter(): Promise<string | null> {
  for (const name of NAMES) if (await isOtter(name)) return name;
  const candidates = localAddresses().flatMap((ip) => PORTS.map((port) => `http://${ip}${port === 80 ? "" : `:${port}`}`));
  const found = await Promise.all(candidates.map(async (address) => ((await isOtter(address)) ? address : null)));
  return found.find((address) => address !== null) ?? null;
}
