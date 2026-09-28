import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

// Fixed, static asset paths. These are the ONLY URLs this route fetches —
// no user-provided value ever flows into a network request or an <img src>.
const FONT_PATH = "/fonts/Inter-Bold.ttf";
const IMAGE_PATH = "/images/urban/DSCF4550.jpg";

// Keep titles short and single-line for the OG card.
function cleanText(value: string | null, max = 120): string {
  const raw = (value || "").replace(/\s+/g, " ").trim();
  if (raw.length <= max) return raw;
  return raw.slice(0, max - 1).trimEnd() + "…";
}

/** Fetch a same-origin static asset and return it as a base64 data URL.
 *  Returns null on any failure (missing asset, network error). */
async function staticDataUrl(
  host: string | null,
  proto: string,
  path: string,
  contentType: string
): Promise<string | null> {
  if (!host) return null;
  try {
    const url = `${proto}://${host}${path}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    // Edge runtimes may not expose Buffer; convert manually.
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk))
      );
    }
    const b64 = typeof btoa === "function" ? btoa(binary) : "";
    if (!b64) return null;
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = cleanText(searchParams.get("title") || "Lucas Hanson");
  const subtitle = cleanText(
    searchParams.get("subtitle") || "Photography & Software",
    80
  );

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";

  // Font is mandatory for @vercel/og.
  const fontUrl = host ? `${proto}://${host}${FONT_PATH}` : null;
  let fonts: any[] = [];
  if (fontUrl) {
    try {
      const resp = await fetch(fontUrl);
      if (resp.ok) {
        fonts.push({
          name: "Inter",
          data: await resp.arrayBuffer(),
          weight: 700,
          style: "normal",
        });
      }
    } catch {
      // handled by the empty-check below
    }
  }
  if (fonts.length === 0) {
    return new Response("OG font unavailable", { status: 500 });
  }

  // Fixed local image (static path, not user input).
  const imageSrc = await staticDataUrl(host, proto, IMAGE_PATH, "image/jpeg");

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(180deg,#050505 0%,#0d0d0f 100%)",
          color: "white",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px",
          boxSizing: "border-box",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 640,
          }}
        >
          <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ fontSize: 26, opacity: 0.85 }}>{subtitle}</div>
          <div style={{ marginTop: 18, fontSize: 14, opacity: 0.65 }}>
            lucashanson.dk — Photos & code
          </div>
        </div>

        {imageSrc && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 420,
              height: 420,
            }}
          >
            <img
              src={imageSrc}
              alt=""
              width={420}
              height={420}
              style={{
                objectFit: "cover",
                borderRadius: 8,
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts,
    }
  );

  return imageResponse;
}
