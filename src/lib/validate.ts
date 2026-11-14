/**
 * Validation shared by the browser form and the API route, so both apply the
 * same rules. Plain TypeScript only: this file is bundled for the client.
 */
import type { RequestDef } from "@/content/requests";

export type Contact = { name: string; company: string; email: string; phone: string; notes: string };
export type Errors = Record<string, string>;

export const emptyContact: Contact = { name: "", company: "", email: "", phone: "", notes: "" };

export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const ZIP = /^\d{5}(-\d{4})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { text: 200, zip: 10, select: 200, textarea: 4000 };

/** Returns cleaned values for the fields the definition declares, plus any errors. */
export function validateDetails(def: RequestDef, input: Record<string, unknown>) {
  const values: Record<string, string> = {};
  const errors: Errors = {};
  for (const field of def.fields) {
    const raw = input[field.name];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) {
        errors[field.name] = field.kind === "select" ? "Choose an option." : "This is required.";
      }
      continue;
    }
    if (value.length > LIMITS[field.kind]) {
      errors[field.name] = `${field.label} is too long.`;
    } else if (field.kind === "zip" && !ZIP.test(value)) {
      errors[field.name] = "Enter a 5-digit ZIP code.";
    } else if (field.kind === "select" && !field.options?.includes(value)) {
      errors[field.name] = "Choose one of the options.";
    } else {
      values[field.name] = value;
    }
  }
  return { values, errors };
}

export function validateContact(input: Record<string, unknown>) {
  const read = (key: keyof Contact) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const values: Contact = {
    name: read("name"),
    company: read("company"),
    email: read("email"),
    phone: read("phone"),
    notes: read("notes"),
  };
  const errors: Errors = {};
  if (!values.name) errors.name = "Your name is required.";
  else if (values.name.length > 120) errors.name = "Name is too long.";
  if (!values.email) errors.email = "Your email is required.";
  else if (values.email.length > 254 || !EMAIL.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.company.length > 160) errors.company = "Company is too long.";
  if (values.phone.length > 40) errors.phone = "Phone is too long.";
  if (values.notes.length > 4000) errors.notes = "Notes are too long.";
  return { values, errors };
}

export function validateFile(file: { type: string; size: number }): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return "Attach a JPG, PNG, WebP, HEIC or PDF file.";
  if (file.size > UPLOAD_MAX_BYTES) return "The file must be 8 MB or smaller.";
  if (file.size === 0) return "The file is empty.";
  return null;
}
