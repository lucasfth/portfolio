"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Bitcoin, Check, Copy, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

type Donation = { address: string; qrCode: string };

export default function BitcoinDonation() {
  const [donation, setDonation] = useState<Donation | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    const controller = new AbortController();
    setDonation(null);
    setError(false);
    setCopyStatus("idle");

    async function loadAddress() {
      try {
        const response = await fetch("/api/bitcoin", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Donation address unavailable");
        const address = (await response.text()).trim();
        const qrCode = await QRCode.toDataURL(`bitcoin:${address}`, {
          width: 256,
          margin: 4,
          errorCorrectionLevel: "M",
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        if (!controller.signal.aborted) setDonation({ address, qrCode });
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }

    // Pin one address for this visit so the QR and controls cannot drift apart.
    void loadAddress();
    return () => controller.abort();
  }, [attempt]);

  async function copyAddress() {
    if (!donation) return;
    try {
      await navigator.clipboard.writeText(donation.address);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="bitcoin-card glass">
      <div className="bitcoin-network">
        <Bitcoin size={18} aria-hidden="true" />
        <span>Bitcoin <span className="bitcoin-network-divider">/</span> Mainnet</span>
      </div>

      {donation ? (
        <>
          <div className="bitcoin-qr">
            {/* Fixed black-on-white contrast and quiet zone in both site themes. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={donation.qrCode}
              width={256}
              height={256}
              alt="Scan to open this Bitcoin donation address in your wallet"
            />
          </div>
          <label className="bitcoin-address-label" htmlFor="bitcoin-address">Receive address</label>
          <textarea
            id="bitcoin-address"
            className="bitcoin-address"
            rows={2}
            value={donation.address}
            readOnly
            spellCheck={false}
            autoComplete="off"
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="bitcoin-actions">
            <button className="bitcoin-button bitcoin-button-primary" type="button" onClick={copyAddress}>
              {copyStatus === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copyStatus === "copied" ? "Copied" : "Copy address"}
            </button>
            <a className="bitcoin-button" href={`bitcoin:${donation.address}`}>
              Open in wallet <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="bitcoin-copy-status" role="status" aria-live="polite">
            {copyStatus === "copied" && "Address copied to clipboard."}
            {copyStatus === "error" && "Could not copy. Select and copy the address above."}
          </p>
        </>
      ) : error ? (
        <div className="bitcoin-state" role="status">
          <p>Bitcoin donations are temporarily unavailable.</p>
          <button className="bitcoin-button" type="button" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <div className="bitcoin-state" role="status" aria-live="polite">
          <div className="bitcoin-qr-placeholder" aria-hidden="true"><Bitcoin size={32} /></div>
          <p>Loading receive address…</p>
        </div>
      )}

      <a className="bitcoin-raw-link" href="/api/bitcoin">Plain-text address <ArrowUpRight size={12} aria-hidden="true" /></a>
    </div>
  );
}
