import Link from "next/link";
import { PhoneLink } from "@/components/PhoneLink";
import { ButtonLink, Eyebrow, container } from "@/components/ui";
import { services } from "@/content/services";
import { facts, site } from "@/lib/site";

const paths = [
  {
    need: "I need toner or ink",
    detail: "Send a cartridge number, a printer model or a photo.",
    cta: "Get a supply quote",
    href: "/request/supplies",
  },
  {
    need: "My printer is down",
    detail: "Tell us the model, the problem and your ZIP code.",
    cta: "Request printer repair",
    href: "/request/repair",
  },
  {
    need: "We need a dependable supplier",
    detail: "Send your supply list or a recent invoice.",
    cta: "Compare business pricing",
    href: "/request/business",
  },
];

const proof = [
  `Family-owned in ${site.base.city}, ${site.base.regionName}`,
  `Supplying and servicing office printers for ${site.yearsInBusiness}`,
  "OEM, remanufactured and generic options, quoted side by side",
  "The same people handle your supplies and your repairs",
  ...(facts.supplyWarranty ? [facts.supplyWarranty] : []),
];

const steps = [
  { title: "Send your model or need", body: "A part number or a clear photo is a great start." },
  { title: "Get clear options", body: "We confirm what fits, what it costs and when it can arrive." },
  { title: "You decide", body: "Nothing is ordered or scheduled until you approve it." },
];

export default function Home() {
  const otherServices = services.filter((service) =>
    ["labels-ribbons", "recycling", "equipment", "business-accounts"].includes(service.slug),
  );

  return (
    <>
      {/* First screen: promise, where we are, the two main actions */}
      <section className="bg-mist">
        <div className={`${container} grid gap-10 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-20`}>
          <div>
            <Eyebrow>
              Business printing supplies &amp; repair · {site.base.city}, {site.base.region}
            </Eyebrow>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Ink, toner and printer repair for your business.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Tell us your printer model and what you need. We find the right supplies, quote your options and help
              keep your equipment running.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/request/supplies">Get a Supply Quote</ButtonLink>
              <ButtonLink href="/request/repair" variant="secondary">
                Request Printer Repair
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
        <div className="mt-6 grid gap-4 md:grid-cols-3">
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

      {/* Reviews: rendered only once real, permitted reviews are added in lib/site.ts */}
      {facts.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className={`${container} py-14`}>
          <h2 id="reviews-heading" className="text-2xl font-bold sm:text-3xl">
            What customers say
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {facts.reviews.map((review) => (
              <figure key={review.quote} className="rounded-2xl border border-line p-6">
                <blockquote className="leading-relaxed">“{review.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">
                  {review.name}
                  {review.company ? <span className="font-normal text-muted">, {review.company}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Other services */}
      <section aria-labelledby="services-heading" className={`${container} py-14`}>
        <h2 id="services-heading" className="text-2xl font-bold sm:text-3xl">
          More than toner
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {otherServices.map((service) => (
            <Link
              key={service.slug}
              href={`/${service.slug}`}
              className="group rounded-2xl border border-line p-6 transition-colors hover:border-brand"
            >
              <h3 className="text-lg font-bold">{service.eyebrow}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand group-hover:underline">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </section>

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
          {facts.replyTime ? <p className="mt-8 font-semibold">We reply {facts.replyTime}.</p> : null}
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
