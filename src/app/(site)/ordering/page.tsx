import type { Metadata } from "next";
import { ButtonLink, PageHeader, container } from "@/components/ui";
import { facts, replyPromise } from "@/lib/site";

export const metadata: Metadata = {
  title: "How Ordering Works",
  description: "How InkAbba quotes, confirms and delivers supply orders, and what to do about a return or a damaged delivery.",
  alternates: { canonical: "/ordering" },
};

const steps = [
  {
    title: "Tell us what you need",
    body: "Send a part number, a printer model or a photo. We confirm what fits and which options are available.",
  },
  {
    title: "Approve your quote",
    body: "We email a quote with pricing, availability, delivery charges and a delivery estimate. Nothing is ordered until you say yes.",
  },
  {
    title: "Delivered to your business",
    body: "Your order is delivered to your address. We share tracking when the carrier provides it.",
  },
];

const notes = [
  {
    heading: "Returns",
    body: facts.returnsPolicy
      ? `${facts.returnsPolicy} Contact us before sending anything back so we can tell you where it goes.`
      : "Contact us before sending anything back. We'll confirm whether the item can be returned and where it should go.",
  },
  {
    heading: "Damaged or incorrect orders",
    body: "Contact us with your order reference and a photo and we'll put it right.",
  },
  // The one place, with the contact page, that says there is no storefront.
  ...(facts.walkIn
    ? []
    : [
        {
          heading: "Delivery only",
          body: "Orders are delivered rather than collected: we don't keep a walk-in counter.",
        },
      ]),
];

export default function OrderingPage() {
  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader
        eyebrow="Ordering"
        title="How ordering works"
        intro={`You approve every order before it's placed.${replyPromise ? ` ${replyPromise}` : ""}`}
      />
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-line p-6">
            <p className="text-sm font-bold text-brand">Step {index + 1}</p>
            <h2 className="mt-1 text-xl font-bold">{step.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {notes.map((note) => (
          <section key={note.heading}>
            <h2 className="text-lg font-bold">{note.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted">{note.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/request/supplies">Get a Supply Quote</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Ask About an Order
        </ButtonLink>
      </div>
    </div>
  );
}
