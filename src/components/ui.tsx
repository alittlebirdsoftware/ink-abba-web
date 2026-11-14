import Link from "next/link";
import type { ReactNode } from "react";

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
