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

export type Review = { quote: string; name: string; company?: string; /** Stars out of 5, when the review has a rating. */ rating?: number };

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
  /** The business's Google Maps listing, linked as "See all reviews on Google". */
  googleProfileUrl: string | null;
  /** The owner's "Ask for reviews" link from Google Business Profile (g.page/r/…/review). */
  googleWriteReviewUrl: string | null;
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
  // Google reviews from the last two years, approved by their authors for the site (added 2026-11-17).
  // Newest first. Older reviews and the owner's replies are left out on purpose.
  reviews: [
    {
      rating: 5,
      name: "Lorenzo Kunst",
      quote: "As an IT professional the prices and attention to service cannot be beat! Always a quick response time.",
    },
    {
      rating: 5,
      name: "Scarlet Tobing",
      quote:
        "Our laser printer was not working after 6.5 years and I found Ink Abba on Google. I reached out because I want to try to repair it instead of buying a new one. Brian has been helpful from the start, willing to spend his time trying to fix our printer. He was very professional, friendly and trustworthy. I would gladly recommend him to anyone!",
    },
    {
      rating: 5,
      name: "Cristian Vargas",
      quote:
        "Ink Abba has been our trusted ink supplier and printer repair service provider for several years. Their reliability and efficiency have been invaluable in ensuring we have everything we need in a timely and effective manner. I can’t overstate how much of an asset they’ve been to our operations.",
    },
    {
      rating: 5,
      name: "Michael Mineo",
      quote:
        "Ink Abba is my go to for toner! Competitive pricing with the best customer service. No one comes close, Ink Abba is the best in town. Highly recommended.",
    },
    {
      rating: 5,
      name: "Gabby Mariage",
      quote:
        "Brian was super helpful and knowledgeable about helping me find exactly what I needed. Great customer service! I’ll definitely be going back.",
    },
  ],
  // The "Ink Abba" listing at 13089 Peyton Dr, Chino Hills (found 2026-11-17).
  googleProfileUrl: "https://maps.google.com/?cid=248101152750692672",
  googleWriteReviewUrl: null,
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
