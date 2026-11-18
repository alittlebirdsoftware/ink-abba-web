"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import { Logo } from "./Logo";
import { PhoneLink } from "./PhoneLink";
import { container } from "./ui";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="border-b border-line bg-white print:hidden">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <Link href="/" className="shrink-0" aria-label={`${site.name} home`}>
          <Logo height={42} priority />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="text-sm font-semibold hover:text-brand aria-[current=page]:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <PhoneLink location="header" className="hidden text-sm font-semibold hover:text-brand sm:inline" />
          <Link
            href="/find-help"
            className="hidden rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark lg:inline-flex"
          >
            Get help
          </Link>
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line lg:hidden">
          <ul className={`${container} divide-y divide-line`}>
            {[...nav, { href: "/find-help", label: "Find help" }, { href: "/contact", label: "Contact" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-3 font-semibold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
