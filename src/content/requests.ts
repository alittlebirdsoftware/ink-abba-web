/**
 * Definitions for every request form. The same definitions drive the form UI
 * (components/RequestForm.tsx) and server-side validation (lib/validate.ts).
 */

export const REQUEST_TYPES = [
  "supplies",
  "repair",
  "labels",
  "recycling",
  "business",
  "equipment",
  "reorder",
  "question",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "select" | "zip";
  required?: boolean;
  options?: string[];
  hint?: string;
};

export type RequestDef = {
  type: RequestType;
  /** Page heading and button label. */
  title: string;
  lead: string;
  fields: FieldDef[];
  /** Label for the optional photo/document field, or null to hide it. */
  attachment: string | null;
  /** Short reassurance shown beside the form. */
  note: string;
};

export const requests: Record<RequestType, RequestDef> = {
  supplies: {
    type: "supplies",
    title: "Get a Supply Quote",
    lead: "A cartridge number, a printer model or a photo is enough to start.",
    fields: [
      { name: "model", label: "Cartridge number or printer model", kind: "text", hint: "For example HP 58A or LaserJet Pro M404n." },
      { name: "need", label: "What do you need?", kind: "textarea", required: true, hint: "Colors, quantities, and how soon you need them." },
      {
        name: "preference",
        label: "Product preference",
        kind: "select",
        required: true,
        options: ["OEM / original brand", "Remanufactured or generic", "Show me both", "I'm not sure"],
      },
    ],
    attachment: "Photo of the cartridge or printer label",
    note: "You'll see pricing and availability before you approve anything.",
  },
  repair: {
    type: "repair",
    title: "Request Printer Repair",
    lead: "Tell us what the machine is doing and where it is.",
    fields: [
      { name: "model", label: "Printer or copier model", kind: "text" },
      {
        name: "problem",
        label: "What's happening?",
        kind: "select",
        required: true,
        options: [
          "Paper jams",
          "Print-quality problem",
          "Error code",
          "Offline or connection issue",
          "Won't turn on",
          "Something else / I'm not sure",
        ],
      },
      { name: "details", label: "Describe the problem", kind: "textarea", hint: "Include any error code shown on the display." },
      { name: "zip", label: "ZIP code where the equipment is", kind: "zip", required: true },
    ],
    attachment: "Photo of the error or the print defect",
    note: "A request is not a booked appointment. We confirm location, cost and timing with you first.",
  },
  labels: {
    type: "labels",
    title: "Get Label & Ribbon Help",
    lead: "Tell us about the printer, the label and what it's used for.",
    fields: [
      {
        name: "item",
        label: "What do you need?",
        kind: "select",
        required: true,
        options: ["Labels", "Ribbons", "Labels and ribbons", "I need help choosing"],
      },
      { name: "model", label: "Printer model", kind: "text", hint: "For example Zebra ZD421." },
      { name: "size", label: "Label size", kind: "text", hint: "For example 4 x 6 in." },
      { name: "use", label: "How will the labels be used?", kind: "textarea", required: true, hint: "Surface, temperature, moisture, how long they need to last." },
    ],
    attachment: "Photo of your current label or ribbon packaging",
    note: "You'll see pricing and availability before you approve anything.",
  },
  recycling: {
    type: "recycling",
    title: "Check Recycling Eligibility",
    lead: "Tell us what you have and we'll tell you what it qualifies for.",
    fields: [
      {
        name: "kind",
        label: "What do you have?",
        kind: "select",
        required: true,
        options: ["Used / empty cartridges", "Unused, sealed toner", "Opened but unused toner", "A mix / I'm not sure"],
      },
      { name: "items", label: "Brand, part numbers and quantity", kind: "textarea", required: true },
      { name: "zip", label: "ZIP code", kind: "zip", required: true },
    ],
    attachment: "Photo of the cartridges or boxes",
    note: "Please don't ship anything until we've confirmed the arrangements with you.",
  },
  business: {
    type: "business",
    title: "Compare Business Pricing",
    lead: "Send your supply list, printer models or a recent invoice.",
    fields: [
      { name: "need", label: "Tell us about your supply needs", kind: "textarea", required: true, hint: "Printer models, what you order, and roughly how often." },
      {
        name: "priority",
        label: "What matters most?",
        kind: "select",
        required: true,
        options: [
          "Compare supply pricing",
          "Find a reliable recurring supplier",
          "Support multiple locations",
          "OEM-only purchasing",
          "I'm not sure yet",
        ],
      },
    ],
    attachment: "Supply list or invoice (remove anything sensitive first)",
    note: "No commitment. You'll get a quote you can compare against what you pay now.",
  },
  equipment: {
    type: "equipment",
    title: "Ask About Equipment",
    lead: "Tell us how you print and we'll suggest new or used options.",
    fields: [
      {
        name: "kind",
        label: "What are you looking for?",
        kind: "select",
        required: true,
        options: ["Office printer", "Copier / multifunction", "Thermal label printer", "I'm not sure"],
      },
      { name: "usage", label: "How do you print?", kind: "textarea", required: true, hint: "Rough monthly volume, color or black-and-white, and budget." },
      {
        name: "condition",
        label: "New or used?",
        kind: "select",
        options: ["New", "Used", "Either"],
      },
    ],
    attachment: null,
    note: "You'll see options and pricing before you approve anything.",
  },
  reorder: {
    type: "reorder",
    title: "Reorder Supplies",
    lead: "No login needed. Tell us what you ordered before or what you need again.",
    fields: [
      { name: "reference", label: "Previous order or invoice number", kind: "text" },
      { name: "items", label: "What do you need?", kind: "textarea", required: true, hint: "Cartridge numbers and quantities, or just \"same as last time\"." },
    ],
    attachment: "Photo of a previous invoice or the cartridge",
    note: "We reconfirm current pricing and availability before you approve.",
  },
  question: {
    type: "question",
    title: "Send a Question",
    lead: "Ask about a product, an existing order, or anything else.",
    fields: [{ name: "message", label: "How can we help?", kind: "textarea", required: true }],
    attachment: null,
    note: "Prefer to talk? Call us during business hours.",
  },
};

export function isRequestType(value: string): value is RequestType {
  return (REQUEST_TYPES as readonly string[]).includes(value);
}
