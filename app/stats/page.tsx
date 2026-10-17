import PageHero from "@/components/PageHero";
import StatsLive from "@/components/StatsLive";
import { SITE_URL } from "@/lib/content";
import { emptyOverview, fetchStatsOverview, isStatsSetupError } from "@/lib/stats/store";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Live, public analytics for this site. One row in Supabase Postgres per visit, written server-side only. No cookies, no fingerprinting, no raw IP addresses stored.";

export const metadata = {
  title: "Stats",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/stats` },
  openGraph: {
    title: "Stats",
    description: DESCRIPTION,
    url: `${SITE_URL}/stats`,
    images: [`${SITE_URL}/api/og?title=Stats&subtitle=Lucas%20Hanson`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stats",
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/og?title=Stats&subtitle=Lucas%20Hanson`],
  },
};

const numberFormat = new Intl.NumberFormat("en-GB");

export default async function StatsPage() {
  let overview = emptyOverview();
  let available = false;
  let setupError = false;
  try {
    overview = await fetchStatsOverview();
    available = true;
  } catch (error) {
    setupError = isStatsSetupError(error);
  }

  const firstVisit = overview.first_visit
    ? new Date(overview.first_visit).toLocaleString("en-GB", {
        timeZone: "Europe/Copenhagen",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <PageHero eyebrow="Live" title="Stats" description={DESCRIPTION} />
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <p className="mb-10 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {available
            ? `${numberFormat.format(overview.total)} visits recorded. First visit ${
                firstVisit ?? "unknown"
              }, Copenhagen time.`
            : setupError
              ? "The stats database is being set up. This page goes live once the migration lands."
              : "The stats are temporarily unavailable."}
        </p>
        <StatsLive initial={overview} available={available} />
        <div className="mt-20 border-t border-border pt-8">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            What is stored
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>The page path, for example /blog/some-post.</li>
            <li>The referrer host when a link from another site is followed.</li>
            <li>
              The short browser time zone region, for example Copenhagen. Cloud hosts and
              agents often send nothing.
            </li>
            <li>
              Whether the visitor is a human browser or an AI agent, guessed from the user
              agent on the server.
            </li>
            <li>
              A daily-salted hash of the IP address, used only to count how many people
              visited in a day, never who. It rotates daily and cannot be matched across
              days. No raw IP address is stored.
            </li>
            <li className="pt-2 font-medium text-foreground">
              No raw IP addresses, no cookies, no personal data, no third parties.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}