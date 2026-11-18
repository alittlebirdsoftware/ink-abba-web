import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";
import { PhoneLink } from "./PhoneLink";
import { container } from "./ui";

const columns = [
  {
    heading: "What we do",
    links: [
      { href: "/ink-toner", label: "Ink & toner" },
      { href: "/printer-repair", label: "Printer & copier repair" },
      { href: "/labels-ribbons", label: "Thermal labels & ribbons" },
      { href: "/recycling", label: "Recycling & buyback" },
      { href: "/equipment", label: "Printers & equipment" },
    ],
  },
  {
    heading: "For your business",
    links: [
      { href: "/business-accounts", label: "Business supply accounts" },
      { href: "/request/reorder", label: "Reorder supplies" },
      { href: "/ordering", label: "How ordering works" },
      { href: "/about", label: "About InkAbba" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-mist pb-24 pt-12 lg:pb-12 print:hidden">
      <div className={`${container} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <p>
            <Logo height={44} />
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Family-owned in {site.base.city}, {site.base.regionName}. Business printing supplies and repair for{" "}
            {site.yearsInBusiness}.
          </p>
          <p className="mt-4 text-sm">
            <PhoneLink location="footer" className="font-semibold hover:text-brand" />
            <br />
            <span className="text-muted">{site.hours.display}</span>
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="text-sm font-bold">{column.heading}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className={`${container} mt-10 text-xs text-muted`}>
        © {new Date().getFullYear()} {site.legalName}. All rights reserved.
      </p>
    </footer>
  );
}
