"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { site } from "@/lib/site";
import { track } from "@/lib/track";
import { buttonStyles } from "./ui";

/** The customer's Approve and Print buttons. */
export function AcceptQuote({ quoteRef, canAccept }: { quoteRef: string; canAccept: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function accept() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/quotes/${quoteRef}/accept`, { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
      track("quote_accept");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row">
        {canAccept ? (
          <button type="button" className={buttonStyles.primary} onClick={accept} disabled={busy}>
            {busy ? "Approving…" : "Approve This Quote"}
          </button>
        ) : null}
        <button type="button" className={buttonStyles.secondary} onClick={() => window.print()}>
          Print or Save as PDF
        </button>
      </div>
      {failed ? (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          We couldn&apos;t record your approval. Please try again, or call {site.phone.display}.
        </p>
      ) : null}
    </div>
  );
}
