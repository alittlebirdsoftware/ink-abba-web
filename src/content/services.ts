import { facts, site } from "@/lib/site";
import type { RequestType } from "./requests";

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
  /**
   * A heading that ends in "?" is a question: its body must open with a
   * direct answer, because the pair also becomes the page's FAQ markup.
   */
  sections: { heading: string; body: string }[];
};

const brands = site.supplyBrands.join(", ");
/** "A, B and C" */
const listed = (items: readonly string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items.join("");
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
        heading: "What's the difference between OEM, remanufactured and generic toner?",
        body: "OEM cartridges are made by the printer's manufacturer. Remanufactured cartridges are original shells that have been cleaned, refilled and tested. Generic cartridges are new, built by a third party. We can quote any of the three side by side so you can weigh price against preference.",
      },
      {
        heading: "Which toner brands do you supply?",
        body: `We supply ${listed(site.supplyBrands)} and others. If your brand isn't listed, ask: the list is not exhaustive.`,
      },
      ...(facts.supplyWarranty
        ? [{ heading: "Is there a warranty on your cartridges?", body: facts.supplyWarranty }]
        : []),
    ],
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
      { heading: "Which areas do you service?", body: areas },
      {
        heading: "Should I repair or replace my printer?",
        body: "It depends on whether the repair costs more than the machine is worth. We'll evaluate the printer's condition and tell you plainly whether it's worth fixing. If it isn't, we can suggest new or used replacements.",
      },
      {
        heading: "Will I know the cost before any work starts?",
        body: facts.diagnosticFee
          ? `Yes. ${facts.diagnosticFee}. Parts and labor are quoted before work begins, and nothing proceeds until you approve it.`
          : "Yes. Diagnostics, parts and labor are quoted before work begins, and nothing proceeds until you approve it.",
      },
      ...(facts.repairWarranty ? [{ heading: "Do you guarantee your repairs?", body: facts.repairWarranty }] : []),
      ...(facts.certifications.length > 0
        ? [{ heading: "Our technicians", body: `Our technicians hold: ${facts.certifications.join(", ")}.` }]
        : []),
    ],
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
        heading: "Do I need direct thermal or thermal transfer labels?",
        body: "Direct thermal labels darken with heat and need no ribbon; they suit short-lived uses such as shipping labels. Thermal transfer uses a ribbon to print onto the label and lasts longer, which matters for inventory, assets and harsh conditions.",
      },
      {
        heading: "Which thermal ribbon do I need: wax, wax-resin or resin?",
        body: "Wax ribbons suit paper labels. Wax-resin holds up better against smudging and scratching. Resin is for synthetic labels that face heat, moisture or chemicals. If you're unsure, a photo of the current ribbon box usually answers it.",
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
        heading: "What's the difference between toner recycling and buyback?",
        body: "Used or empty cartridges are handled through recycling. Unused toner, especially in sealed boxes, may be eligible for buyback. Not every cartridge qualifies for either.",
      },
      ...(facts.recyclingTerms ? [{ heading: "Do you pay for used or unused toner?", body: facts.recyclingTerms }] : []),
      {
        heading: "Can I ship my cartridges to you right away?",
        body: "Please don't ship until we've confirmed eligibility and the arrangements with you.",
      },
    ],
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
        heading: "Do you also service the printers?",
        body: `Yes. We've supplied and serviced office printing equipment for ${site.yearsInBusiness}. The same people who quote your toner can help when a machine goes down.`,
      },
      {
        heading: "How do repeat orders work?",
        body: "Once we know what you use, reordering is a short form or a phone call. There's no portal to learn and no login to remember.",
      },
      ...(facts.paymentTerms ? [{ heading: "What payment terms do you offer?", body: facts.paymentTerms }] : []),
    ],
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
        heading: "Which printer and copier brands do you sell?",
        body: `We offer new and used equipment from ${listed(site.equipmentBrands)}.`,
      },
      {
        heading: "Should I replace my printer or repair it?",
        body: "If your current machine is giving you trouble, we can evaluate it first and tell you whether a repair makes more sense than a replacement.",
      },
    ],
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}
