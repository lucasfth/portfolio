"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendVisit } from "@/lib/stats/beacon";

export default function StatsBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const send = async () => {
      let region: string | null = null;
      try {
        const short = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop();
        if (short && /^[A-Za-z][A-Za-z'-]{1,39}$/.test(short)) region = short;
      } catch { /* Region is optional. */ }
      const ok = await sendVisit(pathname, region);
      if (!ok && !cancelled && ++attempts < 3) retry = setTimeout(send, 30_000);
    };
    void send();
    return () => { cancelled = true; clearTimeout(retry); };
  }, [pathname]);
  return null;
}
