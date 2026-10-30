"use client";

import { useEffect, useRef } from "react";
import { activateDialog } from "@/lib/admin/detail-dialog.mjs";

export type AdminDetail = {
  title: string;
  subtitle: string;
  sections: { title: string; fields: string[][]; notes: string[] }[];
  history?: number[];
  historyCurrency?: string;
  historyNote?: string;
};

export default function AdminDetailDialog({ detail, opener, onClose }: { detail: AdminDetail; opener: HTMLElement | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) return activateDialog({ dialog, opener, body: document.body, onClose });
  }, [opener, onClose]);
  const history = detail.history ?? [];
  const low = history.length ? Math.min(...history) : 0;
  const high = history.length ? Math.max(...history) : 0;
  const padding = high === low ? Math.max(Math.abs(low) * 0.01, 0.01) : 0;
  const min = low - padding;
  const max = high + padding;
  const ticks = [max, min / 2 + max / 2, min];
  const points = history.map((price, i) => `${i / Math.max(1, history.length - 1) * 600},${180 - (price - min) / (max - min || 1) * 180}`).join(" ");
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-detail-title" aria-describedby="admin-detail-description" className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[var(--media-radius)] border border-border bg-background shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-5 sm:p-6">
        <div className="min-w-0"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Source details</p><h2 id="admin-detail-title" className="break-words text-xl font-medium">{detail.title}</h2><p id="admin-detail-description" className="mt-2 text-xs text-muted-foreground">{detail.subtitle}</p></div>
        <button type="button" data-dialog-close data-dialog-focusable aria-label="Close details" onClick={onClose} className="admin-toolbar-button shrink-0">Close</button>
      </header>
      <div className="space-y-6 p-5 sm:p-6">
        {detail.history ? <section aria-labelledby="admin-history-title" className="rounded-[var(--media-radius)] border border-border bg-card p-4">
          <h3 id="admin-history-title" className="text-sm font-medium">Recent daily closes</h3>
          {history.length > 1 ? <div className="mt-4">
            <p data-chart-axis="y" className="mb-2 text-xs text-muted-foreground">Price ({detail.historyCurrency})</p>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <div className="flex h-[180px] flex-col justify-between text-right font-mono text-[10px] tabular-nums text-muted-foreground">{ticks.map((tick, i) => <span key={i} data-chart-y-tick className={i === 0 ? "-translate-y-1/2" : i === 2 ? "translate-y-1/2" : ""}>{tick.toLocaleString("en-GB", { maximumSignificantDigits: 6 })}</span>)}</div>
              <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Recent closing prices; price axis and observation order labelled alongside, values listed below" className="h-[180px] w-full overflow-visible">
                {[0, 90, 180].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} className="text-border" stroke="currentColor" vectorEffect="non-scaling-stroke" />)}
                <line x1="0" x2="0" y1="0" y2="180" className="text-muted-foreground" stroke="currentColor" vectorEffect="non-scaling-stroke" />
                <line x1="0" x2="600" y1="180" y2="180" className="text-muted-foreground" stroke="currentColor" vectorEffect="non-scaling-stroke" />
                <polyline points={points} fill="none" className="text-accent" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div aria-hidden="true" />
              <div className="mt-2 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">{history.map((_, i) => <span key={i} data-chart-x-tick>{i + 1}</span>)}</div>
            </div>
            <p data-chart-axis="x" className="mt-2 text-center text-xs text-muted-foreground">Observation · oldest → newest</p>
          </div> : <p className="mt-3 text-sm text-muted-foreground">Not enough history for a chart.</p>}
          <ol aria-label="Closing prices, oldest to newest" className="mt-3 flex flex-wrap gap-2">{history.map((price, i) => <li key={i} className="rounded border border-border px-2 py-1 font-mono text-xs tabular-nums"><span className="text-muted-foreground">{i + 1}. </span>{price.toLocaleString("en-GB", { maximumFractionDigits: 2 })} {detail.historyCurrency}</li>)}</ol>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail.historyNote}</p>
        </section> : null}
        {detail.sections.map((section, index) => <section key={index} aria-labelledby={`admin-detail-section-${index}`}>
          <h3 id={`admin-detail-section-${index}`} className="border-b border-border pb-2 text-sm font-medium">{section.title}</h3>
          {section.fields.length ? <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">{section.fields.map(([label, value], i) => <div key={i} className="min-w-0"><dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm tabular-nums [overflow-wrap:anywhere]">{value}</dd></div>)}</dl> : null}
          {section.notes.length ? <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{section.notes.map((note, i) => <li key={i} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{note}</li>)}</ul> : null}
        </section>)}
      </div>
    </div>
  </div>;
}
