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
    </div>
  );
}
