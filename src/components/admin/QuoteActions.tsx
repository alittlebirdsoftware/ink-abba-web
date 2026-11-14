"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonStyles } from "@/components/ui";

/** Send-again and copy-link controls on a quote the owner is viewing. */
export function QuoteActions({ number, customerEmail, link }: { number: number; customerEmail: string; link: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");

  async function resend() {
    setNote("Sending…");
    const response = await fetch(`/api/admin/quotes/${number}/send`, { method: "POST" }).catch(() => null);
    setConfirming(false);
    if (response?.ok) {
      setNote(`Sent to ${customerEmail}.`);
      router.refresh();
    } else {
      setNote("The email could not be sent. Try again.");
    }
  }

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-3">
        {confirming ? (
          <>
            <button type="button" className={buttonStyles.primary} onClick={resend}>
              Yes, send to {customerEmail}
            </button>
            <button type="button" className={buttonStyles.secondary} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className={buttonStyles.secondary} onClick={() => setConfirming(true)}>
            Send Again
          </button>
        )}
        <button
          type="button"
          className={buttonStyles.secondary}
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => null);
            setNote("Customer link copied.");
          }}
        >
          Copy Customer Link
        </button>
        <button type="button" className={buttonStyles.secondary} onClick={() => window.print()}>
          Print
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-muted">
        {note}
      </p>
    </div>
  );
}
