import { ArrowUpRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import { SITE_URL } from "@/lib/content";

export const revalidate = 1800;

const DATA_URL = "https://raw.githubusercontent.com/lucasfth/loki-radar/main/public.json?v=2";
const DESCRIPTION =
  "A daily, machine-curated list of tech news, releases and repos I care about. Collected from feeds, Reddit, GitHub and Hacker News, ranked and summarised by a local LLM.";

export const metadata = {
  title: "Radar",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/radar` },
  openGraph: {
    title: "Radar",
    description: DESCRIPTION,
    url: `${SITE_URL}/radar`,
    images: [`${SITE_URL}/api/og?title=Radar&subtitle=Lucas%20Hanson`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar",
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/og?title=Radar&subtitle=Lucas%20Hanson`],
  },
};

type RadarItem = {
  title: string;
  url: string;
  source: string;
  summary: string;
  tag: string;
  score: number;
  kind: string;
  ts: number;
};
type RadarData = { generated: string; count_scanned: number; items: RadarItem[] };

const TAGS: Record<string, string> = {
  "local-llm": "Local LLM",
  agents: "Agents",
  models: "Models",
  devtools: "Dev tools",
  security: "Security",
  selfhosting: "Self-hosting",
  "danish-tech": "Danish tech",
  web: "Web",
  research: "Research",
  other: "Other",
};

async function getRadar(): Promise<RadarData | null> {
  try {
    const res = await fetch(DATA_URL, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as RadarData;
    return Array.isArray(data.items) ? data : null;
  } catch {
    return null;
  }
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function Radar() {
  const data = await getRadar();
  const items = (data?.items ?? []).filter((i) => i.url.startsWith("http"));
  const groups = new Map<string, RadarItem[]>();
  for (const item of items) {
    const tag = TAGS[item.tag] ? item.tag : "other";
    groups.set(tag, [...(groups.get(tag) ?? []), item]);
  }
  const order = Object.keys(TAGS).filter((t) => groups.has(t));
  const updated = data
    ? new Date(data.generated).toLocaleString("en-GB", {
        timeZone: "Europe/Copenhagen",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <PageHero eyebrow="Daily" title="Radar" description={DESCRIPTION} />
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <p className="mb-10 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {updated
            ? `Updated ${updated} Copenhagen time. ${items.length} picks from ${data?.count_scanned ?? 0} items scanned.`
            : "The radar is temporarily unavailable."}
        </p>
        {order.map((tag) => (
          <div key={tag} className="mb-14">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {TAGS[tag]}
            </h2>
            <ul>
              {groups.get(tag)!.map((item) => (
                <li key={item.url} className="border-b border-border">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-6 py-5 transition-colors duration-300 hover:bg-foreground/[0.03]"
                  >
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium tracking-tight">{item.title}</h3>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{item.summary}</p>
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        {item.source}
                        {host(item.url) ? ` / ${host(item.url)}` : ""}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={16}
                      className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
