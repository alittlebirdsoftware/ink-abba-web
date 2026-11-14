import Link from "next/link";
import type { ReactNode } from "react";
import type { Faq } from "@/content/services";

export const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";

const buttonBase =
  "inline-flex min-h-12 items-center justify-center rounded-lg px-5 py-3 text-base font-semibold transition-colors";

export const buttonStyles = {
  primary: `${buttonBase} bg-brand text-white hover:bg-brand-dark`,
  secondary: `${buttonBase} border border-brand bg-white text-brand hover:bg-mist`,
  onDark: `${buttonBase} bg-white text-ink hover:bg-mist`,
};

export function ButtonLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: keyof typeof buttonStyles;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonStyles[variant]}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-widest text-brand">{children}</p>;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p> : null}
    </header>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-14 max-w-3xl">
      <h2 id="faq-heading" className="text-2xl font-bold">
        Common questions
      </h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {faq.q}
              <span aria-hidden className="text-brand transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** FAQPage structured data, so answers can appear in search results. */
export function FaqJsonLd({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
