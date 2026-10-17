import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function statsDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function dailyVisitHash(ip: string | null, secret: string, now = new Date()): string | null {
  if (!ip || !isIP(ip) || !secret) return null;
  // Normalize equivalent IPv6 spellings before hashing.
  const normalized = isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
  return createHmac("sha256", secret).update(`${statsDay(now)}:${normalized}`).digest("hex");
}

export function sanitizePath(value: unknown): string | null {
  return typeof value === "string" && value.length <= 200 && /^\/[a-zA-Z0-9/\-._%()~+]*$/.test(value)
    ? value : null;
}
