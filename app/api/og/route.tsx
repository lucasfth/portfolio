import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Lucas Hanson";
    const subtitle = searchParams.get("subtitle") || "Photography & Software";
    const imageParam = searchParams.get("image") || "/images/urban/DSCF4550-1.jpg";

    // Build absolute image URL for edge runtime (fetch requires absolute URLs)
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const image =
      imageParam.startsWith("http") || !host
        ? imageParam
        : `${proto}://${host}${imageParam}`;

    // Try to load a local font if present in /public/fonts; fall back silently if not found.
    let fonts: any[] = [];
    try {
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

    // Try to fetch the provided image and convert to a data URL so the renderer
    // doesn't have to perform a separate external request. If fetch fails,
    // fall back to the absolute URL string.
    let imageSrc = image;
    try {
      const imgResp = await fetch(image);
      if (imgResp.ok) {
        const imgBuf = await imgResp.arrayBuffer();
        const contentType = imgResp.headers.get("content-type") || "image/jpeg";
        // Edge runtimes may not expose Node Buffer; use a safe fallback.
        let base64: string = "";
        try {
          base64 = typeof Buffer !== "undefined"
            ? Buffer.from(imgBuf).toString("base64")
            : (function (arrayBuffer: ArrayBuffer) {
                let binary = "";
                const bytes = new Uint8Array(arrayBuffer);
                const chunkSize = 0x8000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                  const chunk = bytes.subarray(i, i + chunkSize);
                  binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
                }
                return typeof btoa === "function" ? btoa(binary) : "";
              })(imgBuf);
        } catch (e) {
          // If conversion fails, leave base64 empty and fall back to the original URL
          base64 = "";
        }

        if (base64) {
          imageSrc = `data:${contentType};base64,${base64}`;
        }
      }
    } catch (err) {
      // keep imageSrc as the original absolute URL
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
              src={imageSrc}
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
        fonts: fonts,
      }
    );

    return imageResponse;
  } catch (err) {
    return new Response("Failed to generate image", { status: 500 });
  }
}
