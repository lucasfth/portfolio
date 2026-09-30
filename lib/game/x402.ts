/**
 * x402 v2 payment gate for agent leaderboard entries.
 * Spec: https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md
 */

export const DONATIONS_URL = "https://lucashanson.dk/bitcoin";
const DEFAULT_FACILITATOR_URL = "https://facilitator.payai.network";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
}

export interface X402Config {
  requirements: PaymentRequirements;
  facilitatorUrl: string;
  facilitatorAuth?: string;
}

/** Returns null when no payout address is configured; agent entries are then refused. */
export function readX402Config(env: Record<string, string | undefined> = process.env): X402Config | null {
  const payTo = env.X402_PAY_TO;
  // PayAI runs a public x402 v2 facilitator for Base USDC that needs no API key.
  const facilitatorUrl = env.X402_FACILITATOR_URL || DEFAULT_FACILITATOR_URL;
  if (!payTo || !/^0x[0-9a-fA-F]{40}$/u.test(payTo) || !facilitatorUrl?.startsWith("https://")) {
    return null;
  }
  return {
    requirements: {
      scheme: "exact",
      network: env.X402_NETWORK || "eip155:8453",
      amount: env.X402_AMOUNT || "100000",
      asset: env.X402_ASSET || BASE_USDC,
      payTo,
      maxTimeoutSeconds: 120,
      extra: { name: "USD Coin", version: "2" },
    },
    facilitatorUrl: facilitatorUrl.replace(/\/$/u, ""),
    facilitatorAuth: env.X402_FACILITATOR_AUTH || undefined,
  };
}

export function paymentRequired(resourceUrl: string, config: X402Config | null, error: string) {
  const body = {
    x402Version: 2,
    error,
    resource: {
      url: resourceUrl,
      description: "Leaderboard entry for an automated Damage Control run. Browser sessions that pass the bot check are free.",
      mimeType: "application/json",
      serviceName: "Damage Control",
    },
    accepts: config ? [config.requirements] : [],
    extensions: {},
    donations: DONATIONS_URL,
    message: config
      ? `Agents pay a small fee to enter the leaderboard. Playing and reading are free. To support the site another way, see ${DONATIONS_URL}.`
      : `Agent leaderboard entries are closed until an x402 payout is configured. Playing and reading are free. Donations: ${DONATIONS_URL}.`,
  };
  return Response.json(body, {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(body)).toString("base64"),
      Link: `<${DONATIONS_URL}>; rel="payment"`,
      "Cache-Control": "no-store",
    },
  });
}

export function decodePayment(header: string | null): Record<string, any> | null {
  if (!header || header.length > 8_192) return null;
  try {
    const value = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** The client must accept exactly our terms; a facilitator only checks what it is given. */
export function matchesRequirements(payload: Record<string, any>, requirements: PaymentRequirements): boolean {
  const accepted = payload.accepted;
  return (
    payload.x402Version === 2 &&
    !!accepted &&
    accepted.scheme === requirements.scheme &&
    accepted.network === requirements.network &&
    accepted.amount === requirements.amount &&
    String(accepted.asset).toLowerCase() === requirements.asset.toLowerCase() &&
    String(accepted.payTo).toLowerCase() === requirements.payTo.toLowerCase()
  );
}

async function callFacilitator(
  config: X402Config,
  path: "/verify" | "/settle",
  paymentPayload: unknown,
  fetcher: typeof fetch
): Promise<Record<string, any>> {
  const response = await fetcher(`${config.facilitatorUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.facilitatorAuth ? { Authorization: config.facilitatorAuth } : {}),
    },
    body: JSON.stringify({ x402Version: 2, paymentPayload, paymentRequirements: config.requirements }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`facilitator ${path} returned ${response.status}`);
  return response.json();
}

export function verifyPayment(config: X402Config, payload: unknown, fetcher: typeof fetch = fetch) {
  return callFacilitator(config, "/verify", payload, fetcher);
}

export function settlePayment(config: X402Config, payload: unknown, fetcher: typeof fetch = fetch) {
  return callFacilitator(config, "/settle", payload, fetcher);
}

/**
 * Cheap first filter. Browsers send Fetch Metadata on same-origin fetches.
 * Scripts can forge these headers, so production also requires Vercel BotID (lib/game/human.ts).
 */
export function isSameOriginBrowser(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  const mode = request.headers.get("sec-fetch-mode");
  const origin = request.headers.get("origin");
  const userAgent = request.headers.get("user-agent") || "";
  return (
    site === "same-origin" &&
    mode === "cors" &&
    !!origin &&
    new URL(origin).host === (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host) &&
    /Mozilla\//u.test(userAgent) &&
    !/bot|crawl|spider|headless|python|curl|node|axios|undici|agent|gpt|claude|anthropic|openai|perplexity/iu.test(userAgent)
  );
}
