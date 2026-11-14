/** Sends a GA4 event when analytics is loaded; does nothing otherwise. */
export function track(event: string, params: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", event, params);
}
