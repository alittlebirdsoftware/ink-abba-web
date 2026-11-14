import type { Metadata } from "next";
import { ButtonLink, FaqJsonLd, FaqList, PageHeader, container } from "@/components/ui";
import type { Faq } from "@/content/services";
import { facts } from "@/lib/site";

export const metadata: Metadata = {
  title: "How Ordering Works",
  description: "How InkAbba quotes, confirms and ships supply orders, and what to do about returns or a damaged delivery.",
  alternates: { canonical: "/ordering" },
};

const steps = [
  {
    title: "Request your supplies",
    body: "Send a part number, a printer model or a photo. We confirm what fits and which options are available.",
  },
  {
    title: "Approve the details",
    body: "You see pricing, availability, shipping charges and a delivery estimate before anything is ordered.",
  },
  {
    title: "Delivered to your address",
    body: "Approved orders ship directly to you. We share tracking when the carrier provides it.",
  },
];

const faqs: Faq[] = [
  ...(facts.walkIn
    ? []
    : [
        {
          q: "Can I pick up an order?",
          a: "No. We don't have a retail counter; orders ship directly to your delivery address.",
        },
      ]),
  {
    q: "Can an order arrive in more than one shipment?",
    a: "Yes. Items can ship separately depending on where they're stocked. We'll tell you when that applies.",
  },
  {
    q: "How do I arrange a return?",
    a: facts.returnsPolicy
      ? `${facts.returnsPolicy} Contact us before sending anything back so we can tell you where it goes.`
      : "Contact us before sending anything back. We'll confirm whether the item can be returned and where it should go.",
  },
  {
    q: "What if my order arrives damaged or incorrect?",
    a: "Contact us with your order reference and photos and we'll sort it out.",
  },
];

export default function OrderingPage() {
  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader
        eyebrow="Ordering & shipping"
        title="How ordering works"
        intro="You approve every order before it's placed, and it ships straight to your door."
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
      <FaqList faqs={faqs} />
      <FaqJsonLd faqs={faqs} />
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/request/supplies">Get a Supply Quote</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Ask About an Order
        </ButtonLink>
      </div>
    </div>
  );
}
