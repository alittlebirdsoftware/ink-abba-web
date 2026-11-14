import { site } from "@/lib/site";

/** A timestamp as the owner would read it: local to the business, e.g. "Nov 13, 4:32 PM". */
export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: site.hours.timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
