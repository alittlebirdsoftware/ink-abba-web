"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

/** Lets the owner move a lead through new, contacted, quoted, won and lost. */
export function StatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [note, setNote] = useState("");

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setNote("Saving…");
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (response?.ok) {
      setNote("Saved");
      router.refresh();
    } else {
      setValue(previous);
      setNote("Couldn't save. Try again.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="lead-status" className="font-semibold">
        Status
      </label>
      <select
        id="lead-status"
        value={value}
        onChange={(event) => change(event.target.value)}
        className="rounded-lg border border-line bg-white px-3 py-2 capitalize"
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span role="status" className="text-sm text-muted">
        {note}
      </span>
    </div>
  );
}
