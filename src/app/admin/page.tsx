import type { Metadata } from "next";
import Link from "next/link";
import { Badge, FilterBar, matches } from "@/components/admin/bits";
import { buttonStyles } from "@/components/ui";
import { requests } from "@/content/requests";
import { formatWhen } from "@/lib/format";
import { requireOwner } from "@/lib/server/auth";
import { LEAD_STATUSES, listLeads } from "@/lib/server/leads";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireOwner();
  const { q = "", status = "" } = await searchParams;
  const all = await listLeads();
  const leads = all.filter(
    (lead) =>
      (!status || lead.status === status) &&
      matches(q, lead.contact.name, lead.contact.company, lead.contact.email, lead.contact.phone, ...Object.values(lead.details)),
  );
  const open = all.filter((lead) => lead.status === "new").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted">
            {open === 0 ? "Nothing waiting on a first reply." : `${open} waiting on a first reply.`}
          </p>
        </div>
        <Link href="/admin/quotes/new" className={buttonStyles.secondary}>
          New Quote
        </Link>
      </div>

      <div className="mt-6">
        <FilterBar q={q} status={status} statuses={LEAD_STATUSES} placeholder="Search name, company, email, model…" />
      </div>

      {leads.length === 0 ? (
        <p className="mt-10 text-muted">{all.length === 0 ? "No requests yet. They'll appear here as they come in." : "No leads match that search."}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link href={`/admin/leads/${lead.id}`} className="grid gap-1 py-3 hover:bg-mist sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-4 sm:px-2">
                <span className="text-sm text-muted">{formatWhen(lead.createdAt)}</span>
                <span>
                  <span className="font-semibold">{lead.contact.name}</span>
                  {lead.contact.company ? <span className="text-muted"> · {lead.contact.company}</span> : null}
                  <br />
                  <span className="text-sm text-muted">{requests[lead.type].title}</span>
                </span>
                <Badge status={lead.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
