import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/admin/AuthForms";
import { container } from "@/components/ui";
import { getOwner } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Owner", template: "%s | InkAbba owner" },
  robots: { index: false, follow: false },
};

/** Chrome for the private owner area. Each page checks sign-in itself with requireOwner(). */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const owner = await getOwner();
  return (
    <>
      <header className="border-b border-line bg-white print:hidden">
        <div className={`${container} flex h-14 items-center justify-between gap-4`}>
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-xl font-extrabold tracking-tight">
              Ink<span className="text-brand">Abba</span> <span className="text-sm font-semibold text-muted">owner</span>
            </Link>
            {owner ? (
              <nav aria-label="Owner" className="flex gap-5 text-sm font-semibold">
                <Link href="/admin" className="hover:text-brand">
                  Leads
                </Link>
                <Link href="/admin/quotes" className="hover:text-brand">
                  Quotes
                </Link>
              </nav>
            ) : null}
          </div>
          {owner ? <SignOutButton /> : null}
        </div>
      </header>
      <main className={`${container} py-8`}>{children}</main>
    </>
  );
}
