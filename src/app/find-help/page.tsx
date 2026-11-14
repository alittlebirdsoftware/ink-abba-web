import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Find Help",
  description: "Choose what you need: ink or toner, printer repair, labels, recycling, business pricing, equipment or a reorder.",
  alternates: { canonical: "/find-help" },
};

const choices = [
  { href: "/request/supplies", title: "I need ink or toner", body: "I know the model, or can send a photo." },
  { href: "/request/repair", title: "My printer has a problem", body: "It's jammed, offline, showing an error or printing poorly." },
  { href: "/request/labels", title: "I need labels or ribbons", body: "Help me match the size, material and printer." },
  { href: "/request/recycling", title: "I have toner to recycle or sell", body: "Used cartridges or unused toner." },
  { href: "/request/business", title: "I want business pricing", body: "Compare a supply list or recurring purchases." },
  { href: "/request/equipment", title: "I need a printer", body: "Help me choose new or used equipment." },
  { href: "/request/reorder", title: "I want to reorder", body: "Supplies I've purchased before." },
  { href: "/contact", title: "Something else", body: "Ask a question or check on an existing order." },
];

export default function FindHelpPage() {
  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader
        eyebrow="Find help"
        title="What can we help you with?"
        intro="Pick the closest match. You don't need a part number to get started."
      />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {choices.map((choice) => (
          <li key={choice.href}>
            <Link
              href={choice.href}
              className="group flex h-full flex-col rounded-2xl border border-line p-6 transition-colors hover:border-brand"
            >
              <h2 className="text-lg font-bold">{choice.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{choice.body}</p>
              <span className="mt-4 text-sm font-semibold text-brand group-hover:underline">Continue →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
