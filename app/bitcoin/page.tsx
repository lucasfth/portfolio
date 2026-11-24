import PageHero from "@/components/PageHero";
import BitcoinDonation from "./BitcoinDonation";
import "./BitcoinDonation.css";

export const metadata = {
  title: "Bitcoin donations",
  description: "An optional Bitcoin donation to support Lucas Hanson's work.",
  alternates: { canonical: "https://lucashanson.dk/bitcoin" },
};

export default function BitcoinPage() {
  return (
    <div className="bitcoin-page">
      <PageHero title="Bitcoin donations" />
      <section className="bitcoin-stage" aria-label="Donate Bitcoin">
        <div className="bitcoin-rings" aria-hidden="true">
          <div className="bitcoin-ring bitcoin-ring-inner" />
          <div className="bitcoin-ring bitcoin-ring-middle" />
          <div className="bitcoin-ring bitcoin-ring-outer" />
          <div className="bitcoin-orbit"><span /></div>
        </div>
        <BitcoinDonation />
      </section>
      <section className="md-body mx-auto w-full max-w-3xl px-6 pb-16" aria-label="How donations work">
        <h2>How donations work</h2>
        <p>
          Donations are optional and support the work published on this site. Use Bitcoin
          mainnet only, and choose your own amount. Before sending, review the destination
          address and the network fee in your own wallet.
        </p>
        <p>
          The displayed address is fetched live from <code>/api/bitcoin</code>, so fetch a fresh
          value when you are ready to send rather than reusing a cached one. A new address is
          issued only once a confirmed payment is visible on the public Bitcoin blockchain, and
          previously issued addresses stay valid. If the endpoint
          answers HTTP 503, donations are temporarily unavailable; it is worth trying again
          later. Bitcoin transactions and amounts are public.
        </p>
      </section>
    </div>
  );
}
