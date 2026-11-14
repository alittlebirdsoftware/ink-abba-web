const tones: Record<string, string> = {
  new: "bg-blue-100 text-blue-900",
  contacted: "bg-slate-100 text-slate-800",
  quoted: "bg-amber-100 text-amber-900",
  sent: "bg-amber-100 text-amber-900",
  draft: "bg-slate-100 text-slate-800",
  won: "bg-green-100 text-green-900",
  accepted: "bg-green-100 text-green-900",
  lost: "bg-red-100 text-red-900",
};

/** A status pill. The word carries the meaning; the colour only helps scanning. */
export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${tones[status] ?? tones.draft}`}>
      {label ?? status}
    </span>
  );
}

/** A search box and optional status filter that work as a plain GET form: no script needed. */
export function FilterBar({
  q,
  status,
  statuses,
  placeholder,
}: {
  q: string;
  status: string;
  statuses: readonly string[];
  placeholder: string;
}) {
  return (
    <form method="get" className="flex flex-wrap gap-3" role="search">
      <label className="sr-only" htmlFor="filter-q">
        Search
      </label>
      <input
        id="filter-q"
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2"
      />
      <label className="sr-only" htmlFor="filter-status">
        Status
      </label>
      <select id="filter-status" name="status" defaultValue={status} className="rounded-lg border border-line bg-white px-3 py-2 capitalize">
        <option value="">Any status</option>
        {statuses.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-lg border border-brand px-4 py-2 font-semibold text-brand hover:bg-mist">
        Search
      </button>
    </form>
  );
}

/** True when every word of the search appears somewhere in the given text. */
export function matches(q: string, ...fields: (string | number | null | undefined)[]) {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
