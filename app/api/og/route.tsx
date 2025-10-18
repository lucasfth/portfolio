import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Lucas Hanson";
    const subtitle = searchParams.get("subtitle") || "Photography & Software";
    const image = searchParams.get("image") || "/images/urban/DSCF4550-1.jpg";

    // Try to load a local font if present in /public/fonts; fall back silently if not found.
    let fontData: ArrayBuffer | undefined;
    let fonts: any[] = [];
    try {
      const host = req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") || "https";
      if (host) {
        const fontUrl = `${proto}://${host}/fonts/Inter-Bold.ttf`;
        const fontResp = await fetch(fontUrl);
        if (fontResp.ok) {
          const data = await fontResp.arrayBuffer();
          fonts.push({ name: "Inter", data, weight: 700, style: "normal" });
        }
      }
    } catch (err) {
      // ignore — font optional
    }

    // Compose the image using simple inline styles supported by the runtime
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "630px",
            background: "linear-gradient(180deg,#111827 0%,#0f172a 100%)",
            color: "white",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "56px",
            boxSizing: "border-box",
            fontFamily:
              'Inter, Roboto, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 780,
            }}
          >
            <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.05 }}>
              {title}
            </div>
            <div style={{ fontSize: 28, opacity: 0.85 }}>{subtitle}</div>
            <div style={{ marginTop: 18, fontSize: 14, opacity: 0.7 }}>
              lucashanson.dk — Photos & code
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 420,
              height: 420,
            }}
          >
            {/* Show the provided image as a contained square if available */}
            <img
              src={image}
              alt="preview"
              width={420}
              height={420}
              style={{
                objectFit: "cover",
                borderRadius: 8,
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData
          ? [
              {
                name: "Inter",
                data: fontData,
                weight: 700,
                style: "normal",
              },
            ]
          : [],
      }
    );

    return imageResponse;
  } catch (err) {
    return new Response("Failed to generate image", { status: 500 });
  }
}
