"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { FieldDef, RequestDef } from "@/content/requests";
import { site } from "@/lib/site";
import { track } from "@/lib/track";
import {
  emptyContact,
  validateContact,
  validateDetails,
  validateFile,
  type Contact,
  type Errors,
} from "@/lib/validate";
import { PhoneLink } from "./PhoneLink";
import { buttonStyles } from "./ui";

type Step = "details" | "review" | "sent";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base aria-[invalid=true]:border-red-600";

const contactFields: { name: keyof Contact; label: string; type: string; autoComplete: string; required?: boolean }[] = [
  { name: "name", label: "Your name", type: "text", autoComplete: "name", required: true },
  { name: "company", label: "Company", type: "text", autoComplete: "organization" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
];

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">
        {label} {required ? null : <span className="font-normal text-muted">(optional)</span>}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Uploads the file straight to S3. Returns the object key, or null if it could not be attached. */
async function uploadFile(file: File): Promise<string | null> {
  try {
    const presign = await fetch("/api/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    if (!presign.ok) return null;
    const { url, fields, key } = (await presign.json()) as { url: string; fields: Record<string, string>; key: string };
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append("file", file);
    const upload = await fetch(url, { method: "POST", body: form });
    return upload.ok ? key : null;
  } catch {
    return null;
  }
}

export function RequestForm({ def, replyTime }: { def: RequestDef; replyTime: string | null }) {
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [file, setFile] = useState<File | null>(null);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attachmentSkipped, setAttachmentSkipped] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (step === "details") return;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "center" });
  }, [step]);

  function toReview(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {
      ...validateDetails(def, details).errors,
      ...validateContact(contact).errors,
    };
    if (file) {
      const problem = validateFile(file);
      if (problem) found.attachment = problem;
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#f-${first}`)?.focus();
      return;
    }
    setStep("review");
  }

  async function send() {
    setSending(true);
    setFailed(false);
    let attachmentKey: string | null = null;
    if (file) {
      attachmentKey = await uploadFile(file);
      setAttachmentSkipped(attachmentKey === null);
    }
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: def.type, details, contact, attachmentKey, page: pathname, website }),
      });
      if (response.status === 422) {
        const body = (await response.json()) as { errors?: Errors };
        setErrors(body.errors ?? {});
        setStep("details");
        return;
      }
      if (!response.ok) throw new Error(`status ${response.status}`);
      track("generate_lead", { request_type: def.type });
      setStep("sent");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (step === "sent") {
    return (
      <div className="rounded-2xl border border-line p-6 sm:p-8" role="status">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Thanks, {contact.name.split(" ")[0]}. We have your request.
        </h2>
        <p className="mt-3 leading-relaxed text-muted">
          {replyTime ? `We reply ${replyTime}, ` : "We'll reply "}
          at {contact.email}. Nothing is ordered or scheduled until you approve it.
        </p>
        {attachmentSkipped ? (
          <p className="mt-3 rounded-lg bg-mist p-3 text-sm">
            We couldn&apos;t attach your file. You can send it by replying to our email.
          </p>
        ) : null}
        <p className="mt-4">
          Urgent? Call <PhoneLink location="form_sent" className="font-semibold underline" /> ({site.hours.display}).
        </p>
      </div>
    );
  }

  if (step === "review") {
    const rows: [string, string][] = [
      ...def.fields.filter((f) => details[f.name]?.trim()).map((f): [string, string] => [f.label, details[f.name]]),
      ...(file ? [["Attachment", file.name] as [string, string]] : []),
      ...contactFields.filter((f) => contact[f.name].trim()).map((f): [string, string] => [f.label, contact[f.name]]),
      ...(contact.notes.trim() ? [["Anything else", contact.notes] as [string, string]] : []),
    ];
    return (
      <div className="rounded-2xl border border-line p-6 sm:p-8">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Check your request
        </h2>
        <dl className="mt-5 divide-y divide-line border-y border-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
              <dt className="text-sm font-semibold text-muted">{label}</dt>
              <dd className="whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {failed ? (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 font-semibold text-red-800">
            We couldn&apos;t send your request. Please try again, or call {site.phone.display}.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className={buttonStyles.primary} onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send Request"}
          </button>
          <button type="button" className={buttonStyles.secondary} onClick={() => setStep("details")} disabled={sending}>
            Edit
          </button>
        </div>
      </div>
    );
  }

  const describedBy = (id: string, field: { hint?: string }, error?: string) =>
    [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  function control(field: FieldDef) {
    const id = `f-${field.name}`;
    const error = errors[field.name];
    const shared = {
      id,
      name: field.name,
      value: details[field.name] ?? "",
      required: field.required,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy(id, field, error),
      className: inputClass,
      onChange: (event: { target: { value: string } }) =>
        setDetails((current) => ({ ...current, [field.name]: event.target.value })),
    };
    return (
      <Field key={field.name} id={id} label={field.label} required={field.required} hint={field.hint} error={error}>
        {field.kind === "textarea" ? (
          <textarea rows={4} maxLength={4000} {...shared} />
        ) : field.kind === "select" ? (
          <select {...shared}>
            <option value="">Choose an option</option>
            {field.options?.map((option) => <option key={option}>{option}</option>)}
          </select>
        ) : field.kind === "zip" ? (
          <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={10} {...shared} />
        ) : (
          <input type="text" maxLength={200} {...shared} />
        )}
      </Field>
    );
  }

  return (
    <form ref={formRef} onSubmit={toReview} noValidate className="rounded-2xl border border-line p-6 sm:p-8">
      <fieldset className="space-y-5">
        <legend className="text-xl font-bold">What do you need?</legend>
        {def.fields.map(control)}
        {def.attachment ? (
          <Field
            id="f-attachment"
            label={def.attachment}
            hint="JPG, PNG, WebP, HEIC or PDF, up to 8 MB."
            error={errors.attachment}
          >
            <input
              id="f-attachment"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              aria-invalid={errors.attachment ? true : undefined}
              aria-describedby={describedBy("f-attachment", { hint: "yes" }, errors.attachment)}
              className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-4 file:py-2.5 file:font-semibold file:text-brand"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="mt-8 space-y-5">
        <legend className="text-xl font-bold">How can we reach you?</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {contactFields.map((field) => {
            const id = `f-${field.name}`;
            const error = errors[field.name];
            return (
              <Field key={field.name} id={id} label={field.label} required={field.required} error={error}>
                <input
                  id={id}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  value={contact[field.name]}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy(id, {}, error)}
                  className={inputClass}
                  onChange={(event) => setContact((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              </Field>
            );
          })}
        </div>
        <Field id="f-notes" label="Anything else we should know?" error={errors.notes}>
          <textarea
            id="f-notes"
            name="notes"
            rows={3}
            maxLength={4000}
            value={contact.notes}
            className={inputClass}
            onChange={(event) => setContact((current) => ({ ...current, notes: event.target.value }))}
          />
        </Field>
      </fieldset>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={buttonStyles.primary}>
          Review Request
        </button>
        <p className="text-sm text-muted">No payment and no commitment.</p>
      </div>
    </form>
  );
}
