import { facts, site } from "@/lib/site";
import type { RequestType } from "./requests";

export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /** Shown on the home page card. */
  summary: string;
  request: RequestType;
  /** "What to send us" checklist: specific to each service. */
  send: string[];
  sections: { heading: string; body: string }[];
  faqs: Faq[];
};

/** Keeps only entries whose answer is known, so unanswered questions never ship. */
function known(entries: (Faq | null)[]): Faq[] {
  return entries.filter((entry): entry is Faq => entry !== null);
}

const brands = site.supplyBrands.join(", ");
const areas =
  facts.serviceAreas.length > 0
    ? `We currently offer repair service in ${facts.serviceAreas.join(", ")}.`
    : `We're based in ${site.base.city}. Send the ZIP code where the equipment is and we'll tell you whether we can service it.`;

export const services: Service[] = [
  {
    slug: "ink-toner",
    eyebrow: "Ink & Toner",
    title: "The right ink and toner, without the guesswork.",
    metaTitle: "Ink & Toner for Business",
    metaDescription: `OEM, remanufactured and generic ink and toner for ${brands} and more. Send a cartridge number, printer model or photo for a quote.`,
    summary: "OEM, remanufactured and generic supplies for the machines you already have.",
    intro:
      "Send a cartridge number, a printer model or a photo. We identify the right supplies and quote the options so you can choose.",
    request: "supplies",
    send: [
      "The cartridge number, or the printer model if you don't have it",
      "A photo of the cartridge or the label inside the printer door",
      "Colors and quantities",
      "Whether you prefer OEM, remanufactured or generic",
    ],
    sections: [
      {
        heading: "OEM, remanufactured or generic",
        body: "OEM cartridges are made by the printer's manufacturer. Remanufactured cartridges are original shells that have been cleaned, refilled and tested. Generic cartridges are new, built by a third party. We can quote any of the three side by side so you can weigh price against preference.",
      },
      {
        heading: "Brands we supply",
        body: `${brands} and others. If your brand isn't listed, ask: the list is not exhaustive.`,
      },
      ...(facts.supplyWarranty
        ? [{ heading: "Warranty", body: facts.supplyWarranty }]
        : []),
    ],
    faqs: known([
      {
        q: "Do I need to know the cartridge number?",
        a: "No. The printer model or a clear photo of the cartridge label is enough for us to identify it.",
      },
      {
        q: "Can I compare OEM and compatible options?",
        a: "Yes. Choose \"Show me both\" on the quote request and we'll price each option available for your machine.",
      },
      facts.returnsPolicy ? { q: "Can I return supplies?", a: facts.returnsPolicy } : null,
      facts.walkIn
        ? null
        : { q: "Can I pick up my order?", a: "No. Orders ship directly to your delivery address; we don't have a retail counter." },
    ]),
  },
  {
    slug: "printer-repair",
    eyebrow: "Printer & Copier Repair",
    title: "Printer down? Start with what it's doing.",
    metaTitle: `Printer & Copier Repair in ${site.base.city}, ${site.base.region}`,
    metaDescription: `Printer and copier repair from a family-owned ${site.base.city} business. Jams, error codes, print-quality problems and repair-or-replace advice.`,
    summary: "Jams, error codes and print-quality problems, plus honest repair-or-replace advice.",
    intro:
      "Tell us the model, the symptom and where the machine is. We'll confirm whether we can service it and what happens next.",
    request: "repair",
    send: [
      "The make and model of the printer or copier",
      "What it's doing: jams, streaks, an error code, offline",
      "A photo of the error message or a bad printout",
      "The ZIP code where the equipment is",
    ],
    sections: [
      { heading: "Where we service", body: areas },
      {
        heading: "Repair or replace?",
        body: "Sometimes a repair costs more than the machine is worth. We'll evaluate the printer's condition and tell you plainly whether it's worth fixing. If it isn't, we can suggest new or used replacements.",
      },
      {
        heading: "Before any work starts",
        body: facts.diagnosticFee
          ? `${facts.diagnosticFee}. Parts and labor are quoted before work begins, and nothing proceeds until you approve it.`
          : "Diagnostics, parts and labor are quoted before work begins, and nothing proceeds until you approve it.",
      },
      ...(facts.repairWarranty ? [{ heading: "Repair warranty", body: facts.repairWarranty }] : []),
      ...(facts.certifications.length > 0
        ? [{ heading: "Our technicians", body: `Our technicians hold: ${facts.certifications.join(", ")}.` }]
        : []),
    ],
    faqs: known([
      { q: "Where do you offer repair service?", a: areas },
      facts.diagnosticFee ? { q: "How much does a diagnosis cost?", a: facts.diagnosticFee } : null,
      facts.walkIn
        ? null
        : {
            q: "Can I bring my printer to you?",
            a: "We don't have a walk-in repair counter. Send a request or call first and we'll arrange service with you.",
          },
      {
        q: "Which brands do you repair?",
        a: `${brands} and others. Tell us the model and we'll confirm.`,
      },
    ]),
  },
  {
    slug: "labels-ribbons",
    eyebrow: "Thermal Labels & Ribbons",
    title: "Labels and ribbons that fit the printer and the job.",
    metaTitle: "Thermal Labels & Ribbons",
    metaDescription:
      "Thermal labels and ribbons matched to your printer, label size and application. Tell us the printer and the use and we'll narrow down the options.",
    summary: "Materials matched to your printer, your label size and where the label ends up.",
    intro:
      "The right label depends on the printer, the surface and the conditions. Tell us those three things and we'll narrow down what works.",
    request: "labels",
    send: [
      "The printer model",
      "The label size, or a photo of the current roll",
      "What the label goes on and how long it has to last",
      "Any heat, cold, moisture or chemicals it will face",
    ],
    sections: [
      {
        heading: "Direct thermal or thermal transfer",
        body: "Direct thermal labels darken with heat and need no ribbon; they suit short-lived uses such as shipping labels. Thermal transfer uses a ribbon to print onto the label and lasts longer, which matters for inventory, assets and harsh conditions.",
      },
      {
        heading: "Choosing a ribbon",
        body: "Wax ribbons suit paper labels. Wax-resin holds up better against smudging and scratching. Resin is for synthetic labels that face heat, moisture or chemicals. If you're unsure, a photo of the current ribbon box usually answers it.",
      },
    ],
    faqs: [
      {
        q: "I don't know which ribbon I need.",
        a: "Send the printer model and what the labels are used for. A photo of the current label or ribbon packaging helps.",
      },
      {
        q: "Can you help with refrigerated or damp environments?",
        a: "Yes. Describe the temperature, the surface and the exposure, and we'll suggest materials suited to it.",
      },
    ],
  },
  {
    slug: "recycling",
    eyebrow: "Toner Recycling & Buyback",
    title: "Find out what your used or unused toner qualifies for.",
    metaTitle: "Toner Recycling & Buyback",
    metaDescription:
      "Used-cartridge recycling and unused-toner buyback inquiries. Send the brand, part numbers, condition and quantity and we'll confirm what's eligible.",
    summary: "Used-cartridge recycling and unused-toner buyback, with eligibility confirmed first.",
    intro:
      "Recycling used cartridges and selling back unused toner are two different things. Tell us what you have and we'll confirm which applies.",
    request: "recycling",
    send: [
      "The brand and part numbers",
      "Whether each item is used, sealed, or opened but unused",
      "The quantity",
      "Your ZIP code",
    ],
    sections: [
      {
        heading: "Recycling and buyback are separate",
        body: "Used or empty cartridges are handled through recycling. Unused toner, especially in sealed boxes, may be eligible for buyback. Not every cartridge qualifies for either.",
      },
      ...(facts.recyclingTerms ? [{ heading: "Fees and credit", body: facts.recyclingTerms }] : []),
      {
        heading: "Please don't ship first",
        body: "Wait until we've confirmed eligibility and the arrangements with you before sending anything.",
      },
    ],
    faqs: known([
      facts.recyclingTerms ? { q: "Is there a fee, or will I receive credit?", a: facts.recyclingTerms } : null,
      {
        q: "Does opened toner qualify for buyback?",
        a: "It depends on the cartridge and its condition. Tell us what you have and we'll check.",
      },
    ]),
  },
  {
    slug: "business-accounts",
    eyebrow: "Business Supply Accounts",
    title: "One dependable supplier for everything your office prints with.",
    metaTitle: "Business Supply Accounts",
    metaDescription:
      "Send your supply list or a recent invoice and get a business pricing comparison. Repeat ordering and multi-location support from a family-owned supplier.",
    summary: "Send your supply list and compare what you pay now against a quote from us.",
    intro:
      "Send your supply list, your printer models or a recent invoice with anything sensitive removed. We'll price it so you can compare.",
    request: "business",
    send: [
      "Your printer and copier models",
      "What you order and roughly how often",
      "A recent invoice, with account numbers and pricing you'd rather not share removed",
      "Whether you need OEM only",
    ],
    sections: [
      {
        heading: "More than a source of supplies",
        body: `We've supplied and serviced office printing equipment for ${site.yearsInBusiness}. The same people who quote your toner can help when a machine goes down.`,
      },
      {
        heading: "Repeat orders",
        body: "Once we know what you use, reordering is a short form or a phone call. There's no portal to learn and no login to remember.",
      },
      ...(facts.paymentTerms ? [{ heading: "Payment terms", body: facts.paymentTerms }] : []),
    ],
    faqs: known([
      {
        q: "Do you guarantee savings?",
        a: "No. Pricing depends on the products and quantities. We give you a quote and you compare it against what you pay today.",
      },
      facts.paymentTerms ? { q: "Do you offer payment terms?", a: facts.paymentTerms } : null,
      {
        q: "Can you supply more than one location?",
        a: "Tell us the locations on the request and we'll confirm what we can arrange for each.",
      },
    ]),
  },
  {
    slug: "equipment",
    eyebrow: "Printers & Equipment",
    title: "Equipment that fits how you actually print.",
    metaTitle: "New & Used Printers and Copiers",
    metaDescription: `New and used copiers, printers and thermal printers from ${site.equipmentBrands.join(", ")}. Tell us your volume and budget for options.`,
    summary: "New and used copiers, office printers and thermal printers.",
    intro:
      "Tell us your monthly volume, whether you need color, and your budget. We'll suggest new or used options that fit.",
    request: "equipment",
    send: [
      "Roughly how many pages you print a month",
      "Color or black-and-white",
      "Features you rely on: scanning, duplex, label printing",
      "Your budget, and whether used equipment is an option",
    ],
    sections: [
      {
        heading: "Brands we offer",
        body: `${site.equipmentBrands.join(", ")}.`,
      },
      {
        heading: "Not sure whether to replace?",
        body: "If your current machine is giving you trouble, we can evaluate it first and tell you whether a repair makes more sense than a replacement.",
      },
    ],
    faqs: known([
      facts.walkIn
        ? null
        : {
            q: "Do you have a showroom?",
            a: "No. Tell us what you need and we'll send options, condition details and pricing.",
          },
    ]),
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}
