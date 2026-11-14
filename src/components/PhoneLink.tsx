"use client";

import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { track } from "@/lib/track";

/** Click-to-call link. Records a `phone_click` event: calling intent, not a confirmed call. */
export function PhoneLink({
  location,
  className,
  children,
}: {
  location: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={site.phone.href} className={className} onClick={() => track("phone_click", { location })}>
      {children ?? site.phone.display}
    </a>
  );
}
