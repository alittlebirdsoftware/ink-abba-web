"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonStyles } from "@/components/ui";
import { money, quoteTotals, type QuoteDraft } from "@/lib/quote";
import type { QuoteForm } from "@/lib/quoteForm";

const inputClass = "block w-full rounded-lg border border-line bg-white px-3 py-2 text-base";
const blankItem = { description: "", qty: "1", price: "" };

const toCents = (value: string) => {
  const amount = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};
const toNumber = (value: string) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

function toDraft(form: QuoteForm): QuoteDraft {
  return {
    customer: form.customer,
    // A line the owner left completely empty is dropped rather than rejected.
    items: form.items
      .filter((item) => item.description.trim() || item.price.trim())
      .map((item) => ({ description: item.description, qty: toNumber(item.qty), unitCents: toCents(item.price) })),
    shippingCents: toCents(form.shipping),
    taxRate: toNumber(form.taxRate),
    notes: form.notes,
    validUntil: form.validUntil,
  };
}

export function QuoteBuilder({
  number,
  leadId,
  initial,
}: {
  /** Set when editing an existing draft. */
  number?: number;
  leadId?: string | null;
  initial: QuoteForm;
}) {
  const router = useRouter();
  const [form, setForm] = useState<QuoteForm>(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const draft = toDraft(form);
  const totals = quoteTotals(draft);

  const setCustomer = (field: keyof QuoteForm["customer"], value: string) =>
    setForm((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
  const setItem = (index: number, field: keyof QuoteForm["items"][number], value: string) =>
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));

  async function save(send: boolean) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number: number ?? null, leadId: leadId ?? null, draft, send }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { number?: number; error?: string } | null;
    setBusy(false);
    setConfirming(false);
    if (response?.ok && body?.number) {
      router.push(`/admin/quotes/${body.number}`);
      router.refresh();
      return;
    }
    setError(body?.error ?? "The quote could not be saved. Try again.");
    // A failed send still saves the draft: carry on editing that one, not a second copy.
    if (body?.number && !number) router.replace(`/admin/quotes/${body.number}/edit`);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        setConfirming(true);
      }}
    >
      <fieldset>
        <legend className="text-lg font-bold">Customer</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Name", "text", true],
              ["company", "Company", "text", false],
              ["email", "Email", "email", true],
              ["phone", "Phone", "tel", false],
            ] as const
          ).map(([field, label, type, required]) => (
            <label key={field} className="block text-sm font-semibold">
              {label}
              <input
                type={type}
                required={required}
                value={form.customer[field]}
                onChange={(event) => setCustomer(field, event.target.value)}
                className={`${inputClass} mt-1 font-normal`}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold">Items</legend>
        <div className="mt-3 space-y-3">
          {form.items.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_5rem_7rem_7rem_auto] sm:items-end">
              <label className="col-span-3 block text-sm font-semibold sm:col-span-1">
                <span className={index > 0 ? "sm:sr-only" : ""}>Description</span>
                <input
                  type="text"
                  value={item.description}
                  maxLength={300}
                  onChange={(event) => setItem(index, "description", event.target.value)}
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
              <label className="block text-sm font-semibold">
                <span className={index > 0 ? "sm:sr-only" : ""}>Qty</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.qty}
                  onChange={(event) => setItem(index, "qty", event.target.value)}
                  className={`${inputClass} mt-1 text-right font-normal`}
                />
              </label>
              <label className="block text-sm font-semibold">
                <span className={index > 0 ? "sm:sr-only" : ""}>Unit price ($)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.price}
                  onChange={(event) => setItem(index, "price", event.target.value)}
                  className={`${inputClass} mt-1 text-right font-normal`}
                />
              </label>
              <p className="hidden py-2 text-right tabular-nums sm:block" aria-label="Line amount">
                {money(Math.round(toNumber(item.qty) * toCents(item.price)))}
              </p>
              <button
                type="button"
                className="self-end rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-red-700 disabled:opacity-40"
                disabled={form.items.length === 1}
                aria-label={`Remove line ${index + 1}`}
                onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 font-semibold text-brand hover:underline"
          onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...blankItem }] }))}
        >
          + Add a line
        </button>
      </fieldset>

      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <fieldset className="space-y-4">
          <legend className="text-lg font-bold">Terms</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Delivery ($)
              <input
                type="text"
                inputMode="decimal"
                value={form.shipping}
                onChange={(event) => setForm((current) => ({ ...current, shipping: event.target.value }))}
                className={`${inputClass} mt-1 text-right font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Tax rate (%)
              <input
                type="text"
                inputMode="decimal"
                value={form.taxRate}
                onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))}
                className={`${inputClass} mt-1 text-right font-normal`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Valid until
              <input
                type="date"
                required
                value={form.validUntil}
                onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))}
                className={`${inputClass} mt-1 font-normal`}
              />
            </label>
          </div>
          <p className="text-sm text-muted">Tax is worked out on the items only, not on delivery.</p>
          <label className="block text-sm font-semibold">
            Notes for the customer
            <textarea
              rows={4}
              maxLength={4000}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className={`${inputClass} mt-1 font-normal`}
            />
          </label>
        </fieldset>

        <dl className="h-fit rounded-2xl bg-mist p-5 tabular-nums" aria-label="Quote total">
          <div className="flex justify-between py-1">
            <dt className="text-muted">Subtotal</dt>
            <dd>{money(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted">Tax</dt>
            <dd>{money(totals.tax)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted">Delivery</dt>
            <dd>{money(totals.shipping)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink pt-2 text-xl font-bold">
            <dt>Total</dt>
            <dd>{money(totals.total)}</dd>
          </div>
        </dl>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 font-semibold text-red-800">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="rounded-2xl border border-brand p-5">
          <p className="font-semibold">
            Email this quote for {money(totals.total)} to {form.customer.email || "the customer"}?
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={buttonStyles.primary} disabled={busy} onClick={() => save(true)}>
              {busy ? "Sending…" : "Yes, Send It"}
            </button>
            <button type="button" className={buttonStyles.secondary} disabled={busy} onClick={() => setConfirming(false)}>
              Not Yet
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={buttonStyles.primary} disabled={busy}>
            Send to Customer
          </button>
          <button type="button" className={buttonStyles.secondary} disabled={busy} onClick={() => save(false)}>
            {busy ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      )}
    </form>
  );
}
