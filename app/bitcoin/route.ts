import { getBitcoinReceiveAddress } from "@/lib/bitcoin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  const zpub = process.env.BITCOIN_ZPUB;
  if (zpub) {
    try {
      const address = await getBitcoinReceiveAddress(zpub);
      return new Response(`${address}\n`, { headers: RESPONSE_HEADERS });
    } catch {
      // Do not expose configuration, account keys, or provider errors publicly.
    }
  }

  return new Response("Bitcoin donations are temporarily unavailable.\n", {
    status: 503,
    headers: RESPONSE_HEADERS,
  });
}
