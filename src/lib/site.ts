/**
 * Business facts used across the site.
 *
 * `site` holds what the current inkabba.com already publishes.
 * `facts` holds what the owner still has to confirm. Anything left null or
 * empty is simply not rendered, so the site never shows a made-up promise.
 */

export const site = {
  name: "InkAbba",
  legalName: "Ink Abba",
  description:
    "Family-owned business printing partner in Chino Hills, CA. Ink and toner, printer and copier repair, thermal labels and ribbons, and toner recycling.",
  url: process.env.SITE_URL ?? "https://inkabba.com",
  // A local 909 number is planned. Change it here and every page, link and email follows.
  phone: { display: "(888) 556-9444", href: "tel:+18885569444", e164: "+18885569444" },
  email: "Inkabba@outlook.com",
  base: { city: "Chino Hills", region: "CA", regionName: "California" },
  // The live site shows Monday as "8:30 am – 3:30 am"; assumed to be a typo for pm.
  hours: {
    display: "Mon–Fri, 8:30 am – 3:30 pm PT",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:30",
    closes: "15:30",
    timeZone: "America/Los_Angeles",
  },
  yearsInBusiness: "over a decade",
  supplyBrands: ["HP", "Lexmark", "Canon", "Konica Minolta", "Sharp", "Xerox"],
  equipmentBrands: ["Lexmark", "HP", "Xerox", "Konica Minolta", "Canon", "Dell", "Zebra"],
} as const;

export type Review = { quote: string; name: string; company?: string };

export const facts: {
  /** How fast requests are answered while open. Shown on every form and confirmation. */
  replyTime: string | null;
  /** Cities where on-site repair is actually offered, e.g. ["Chino Hills", "Chino"]. */
  serviceAreas: string[];
  /** e.g. "$89 diagnostic fee, credited toward the repair". */
  diagnosticFee: string | null;
  /** e.g. "90 days on parts and labor". */
  repairWarranty: string | null;
  /** From the current site's banner. A full sentence: it is shown as written. */
  supplyWarranty: string | null;
  /** One or two sentences: what is accepted, any fee, any credit. The live site says "Paid Recycling Program". */
  recyclingTerms: string | null;
  /** e.g. "Net 30 for approved business accounts". */
  paymentTerms: string | null;
  /** e.g. "Unopened supplies can be returned within 30 days". */
  returnsPolicy: string | null;
  /** Named technician credentials, e.g. ["HP certified", "Lexmark authorized"]. */
  certifications: string[];
  /** False means no storefront or pickup. Stated once, on the contact and ordering pages only. */
  walkIn: boolean;
  /**
   * Hand-picked reviews, used when Google reviews are not connected or to
   * add to them. Only include reviews the customer has agreed to publish.
   */
  reviews: Review[];
} = {
  replyTime: "within 2 minutes",
  serviceAreas: [],
  diagnosticFee: null,
  repairWarranty: null,
  supplyWarranty: "Every cartridge we sell is covered by a 100% lifetime warranty.",
  recyclingTerms: null,
  paymentTerms: null,
  returnsPolicy: null,
  certifications: [],
  walkIn: false,
  reviews: [],
};

export const nav = [
  { href: "/ink-toner", label: "Ink & Toner" },
  { href: "/printer-repair", label: "Printer Repair" },
  { href: "/labels-ribbons", label: "Labels & Ribbons" },
  { href: "/recycling", label: "Recycling" },
  { href: "/business-accounts", label: "Business Accounts" },
] as const;

/** True while the business is open, judged in its own time zone. */
export function isOpenNow(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: site.hours.timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const time = `${get("hour")}:${get("minute")}`;
  return (
    (site.hours.days as readonly string[]).includes(get("weekday")) &&
    time >= site.hours.opens &&
    time < site.hours.closes
  );
}

/** The reply promise as a sentence, or null until a reply time is set. */
export const replyPromise = facts.replyTime ? `We reply ${facts.replyTime} during business hours.` : null;

/** What to tell someone who has just sent a request, depending on whether we are open. */
export function replyExpectation(now: Date = new Date()): string {
  if (!facts.replyTime) return "We'll be in touch soon.";
  return isOpenNow(now)
    ? `We reply ${facts.replyTime}.`
    : `We're closed right now. We'll reply as soon as we open (${site.hours.display}).`;
}
