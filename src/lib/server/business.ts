import "server-only";

/**
 * The business email. Kept off public pages and out of the browser JavaScript so spam scrapers
 * cannot collect it: customers reach the business through the forms or by phone. It is shown only
 * on a customer's own quote page, which needs the secret link to open.
 */
export const businessEmail = "sales@inkabba.com";
