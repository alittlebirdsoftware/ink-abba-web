import Image from "next/image";
import { site } from "@/lib/site";

/**
 * The InkAbba logo laid out in a row: the ink drop, then the wordmark.
 * Both come from the original logo (public/brand/inkabba-logo.png keeps the stacked version).
 * `height` is the drop's height in pixels; the wordmark scales with it.
 */
export function Logo({ height = 40, priority = false }: { height?: number; priority?: boolean }) {
  const dropWidth = Math.round((height * 189) / 299);
  const wordHeight = Math.round(height * 0.5);
  const wordWidth = Math.round((wordHeight * 830) / 146);
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/brand/inkabba-drop.png" alt="" width={dropWidth} height={height} priority={priority} />
      <Image src="/brand/inkabba-wordmark.png" alt={site.name} width={wordWidth} height={wordHeight} priority={priority} />
    </span>
  );
}
