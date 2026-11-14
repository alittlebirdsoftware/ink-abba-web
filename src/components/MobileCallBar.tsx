import Link from "next/link";
import { site } from "@/lib/site";
import { PhoneLink } from "./PhoneLink";

/** Keeps the phone number and a help button on screen on phones, on every page. */
export function MobileCallBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1.5fr_1fr] gap-2 border-t border-line bg-white p-2 lg:hidden print:hidden">
      <PhoneLink
        location="mobile_bar"
        className="flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg border border-brand text-[15px] font-semibold text-brand"
      >
        Call {site.phone.display}
      </PhoneLink>
      <Link
        href="/find-help"
        className="flex min-h-12 items-center justify-center rounded-lg bg-brand font-semibold text-white"
      >
        Get help
      </Link>
    </div>
  );
}
