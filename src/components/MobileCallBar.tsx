import Link from "next/link";
import { PhoneLink } from "./PhoneLink";

/** Keeps a call button and a quote button on screen on phones. */
export function MobileCallBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-white p-2 lg:hidden">
      <PhoneLink
        location="mobile_bar"
        className="flex min-h-12 items-center justify-center rounded-lg border border-brand font-semibold text-brand"
      >
        Call us
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
