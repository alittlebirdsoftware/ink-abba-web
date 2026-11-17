import Image from "next/image";
import Link from "next/link";
import { PhoneLink } from "@/components/PhoneLink";
import { Reviews } from "@/components/Reviews";
import { ButtonLink, Eyebrow, container } from "@/components/ui";
import { services } from "@/content/services";
import { getGoogleReviews } from "@/lib/server/reviews";
import { facts, replyPromise, site } from "@/lib/site";

const paths = [
  {
    need: "My printer is down",
    detail: "Tell us the model, the problem and your ZIP code.",
    cta: "Request printer repair",
    href: "/request/repair",
  },
  {
    need: "I need toner or ink",
    detail: "Send a cartridge number, a printer model or a photo.",
    cta: "Get a supply quote",
    href: "/request/supplies",
  },
  {
    need: "I need labels or ribbons",
    detail: "Tell us the printer, the label size and what it's for.",
    cta: "Get label & ribbon help",
    href: "/request/labels",
  },
  {
    need: "We need a dependable supplier",
    detail: "Send your supply list or a recent invoice.",
    cta: "Compare business pricing",
    href: "/request/business",
  },
];

const proof = [
  ...(replyPromise ? [replyPromise.replace(/\.$/, "")] : []),
  `Family-owned in ${site.base.city}, ${site.base.regionName}`,
  `Supplying and servicing office printers for ${site.yearsInBusiness}`,
  "OEM, remanufactured and generic options, quoted side by side",
  "The same people handle your supplies and your repairs",
  ...(facts.supplyWarranty ? [facts.supplyWarranty.replace(/\.$/, "")] : []),
];

/** The four photo cards. Each slug is a service page and names its photo in public/images/services/. */
const featured = [
  { slug: "ink-toner", title: "Ink & Toner", alt: "Cyan, magenta, yellow and black toner cartridges on a desk" },
  { slug: "printer-repair", title: "Printer & Copier Repair", alt: "Office printer open for service, with a screwdriver" },
  { slug: "labels-ribbons", title: "Thermal Labels & Ribbons", alt: "A roll of white thermal labels beside a black ribbon" },
  { slug: "recycling", title: "Recycling & Buyback", alt: "Used toner cartridges in a recycling bin beside a shipping box" },
] as const;

function ServiceIcon({ name }: { name: (typeof featured)[number]["slug"] }) {
  const paths: Record<typeof name, string> = {
    "ink-toner": "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
    "printer-repair":
      "M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
    "labels-ribbons": "M4 5v14M7 5v14M10.5 5v14M13 5v14M16.5 5v14M20 5v14",
    recycling: "M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
  };
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-brand">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[name]} />
      </svg>
    </span>
  );
}

const steps = [
  { title: "Send your model or need", body: "A part number or a clear photo is a great start." },
  { title: "Get a quote by email", body: "We confirm what fits, what it costs and when it can arrive." },
  { title: "You decide", body: "Nothing is ordered or scheduled until you approve it." },
];

export default async function Home() {
  const google = await getGoogleReviews();
  const otherServices = services.filter((service) => ["equipment", "business-accounts"].includes(service.slug));

  return (
    <>
      {/* First screen: promise, where we are, the two main actions */}
      <section className="bg-mist">
        <div className={`${container} grid gap-10 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-20`}>
          <div>
            <Eyebrow>
              Your local printing partner · {site.base.city}, {site.base.region}
            </Eyebrow>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Printer repair, toner and labels for your business.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Tell us your printer model and what you need. We fix what&apos;s broken, find the right supplies and
              quote your options fast.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/request/repair">Request Printer Repair</ButtonLink>
              <ButtonLink href="/request/supplies" variant="secondary">
                Get a Supply Quote
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-muted">
              Or call <PhoneLink location="hero" className="font-semibold text-ink underline" /> · {site.hours.display}
            </p>
          </div>

          <aside aria-label="Why InkAbba" className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold">Why businesses call us</h2>
            <ul className="mt-4 space-y-3">
              {proof.map((item) => (
                <li key={item} className="flex gap-3 leading-snug">
                  <span aria-hidden className="mt-0.5 font-bold text-brand">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Three customer needs */}
      <section aria-labelledby="paths-heading" className={`${container} py-14`}>
        <h2 id="paths-heading" className="text-2xl font-bold sm:text-3xl">
          What do you need today?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group flex flex-col rounded-2xl border border-line p-6 transition-colors hover:border-brand"
            >
              <h3 className="text-xl font-bold">“{path.need}.”</h3>
              <p className="mt-2 flex-1 text-muted">{path.detail}</p>
              <span className="mt-5 font-semibold text-brand group-hover:underline">{path.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Photo cards for the four main services */}
      <section aria-labelledby="services-heading" className={`${container} pb-14`}>
        <h2 id="services-heading" className="text-2xl font-bold sm:text-3xl">
          More than toner. Support for your entire office.
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((card) => (
            <Link
              key={card.slug}
              href={`/${card.slug}`}
              className="group overflow-hidden rounded-2xl border border-line transition-colors hover:border-brand"
            >
              <Image
                src={`/images/services/${card.slug}.webp`}
                alt={card.alt}
                width={1536}
                height={1024}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="flex items-center gap-3 p-5">
                <ServiceIcon name={card.slug} />
                <h3 className="text-lg font-bold leading-snug group-hover:underline">{card.title}</h3>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted">
          Also:{" "}
          {otherServices.map((service, index) => (
            <span key={service.slug}>
              {index > 0 ? " · " : null}
              <Link href={`/${service.slug}`} className="font-semibold text-brand hover:underline">
                {service.eyebrow}
              </Link>
            </span>
          ))}
        </p>
      </section>

      {/* Brands */}
      <section aria-labelledby="brands-heading" className="border-y border-line">
        <div className={`${container} py-8 text-center`}>
          <h2 id="brands-heading" className="text-sm font-semibold uppercase tracking-widest text-muted">
            Supplies and service for
          </h2>
          <p className="mt-3 text-lg font-bold leading-relaxed">
            {[...new Set([...site.supplyBrands, ...site.equipmentBrands])].join(" · ")}
          </p>
        </div>
      </section>

      <Reviews google={google} curated={facts.reviews} />

      {/* How it works */}
      <section aria-labelledby="how-heading" className="bg-mist">
        <div className={`${container} py-14`}>
          <h2 id="how-heading" className="text-2xl font-bold sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <p className="text-sm font-bold text-brand">Step {index + 1}</p>
                <h3 className="mt-1 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          {replyPromise ? <p className="mt-8 font-semibold">{replyPromise}</p> : null}
        </div>
      </section>

      {/* Existing customers and the undecided */}
      <section className={`${container} py-14`}>
        <div className="rounded-2xl bg-ink p-8 text-white sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Already a customer? Reorder in a minute.</h2>
          <p className="mt-3 max-w-2xl text-white/80">
            No login needed. Tell us what you ordered before and we&apos;ll reconfirm pricing and availability.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/request/reorder" variant="onDark">
              Reorder Supplies
            </ButtonLink>
            <Link
              href="/find-help"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/50 px-5 py-3 font-semibold hover:bg-white/10"
            >
              Not sure what you need?
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
