import type { GoogleReviews } from "@/lib/server/reviews";
import type { Review } from "@/lib/site";
import { container } from "./ui";

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="tracking-wide text-amber-500">
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/**
 * Customer reviews. Google reviews keep the author, a link to the original
 * and the "Google Maps" attribution, as Google's terms require.
 * Renders nothing when there are no reviews of either kind.
 */
export function Reviews({ google, curated }: { google: GoogleReviews | null; curated: Review[] }) {
  const googleReviews = google?.reviews ?? [];
  if (googleReviews.length === 0 && curated.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className={`${container} py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="text-2xl font-bold sm:text-3xl">
            What customers say
          </h2>
          {google?.rating ? (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <Stars rating={google.rating} />
              <span className="font-semibold">{google.rating.toFixed(1)}</span>
              {google.count ? <span className="text-muted">from {google.count} reviews on</span> : null}
              <span className="whitespace-nowrap font-semibold">Google Maps</span>
            </p>
          ) : null}
        </div>
        {google?.url ? (
          <a href={google.url} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
            Read all reviews →
          </a>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {googleReviews.map((review) => (
          <figure key={`${review.author}-${review.when}`} className="flex flex-col rounded-2xl border border-line p-6">
            <Stars rating={review.rating} />
            <blockquote className="mt-3 flex-1 leading-relaxed">{review.text}</blockquote>
            <figcaption className="mt-4 flex items-center gap-3 text-sm">
              {review.authorPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element -- small remote avatar; not worth an image-optimizer round trip
                <img
                  src={review.authorPhoto}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full"
                />
              ) : null}
              <span>
                {review.authorUrl ? (
                  <a href={review.authorUrl} target="_blank" rel="noopener" className="font-semibold hover:underline">
                    {review.author}
                  </a>
                ) : (
                  <span className="font-semibold">{review.author}</span>
                )}
                <br />
                <span className="text-muted">
                  {review.when}
                  {review.url ? (
                    <>
                      {" · "}
                      <a href={review.url} target="_blank" rel="noopener" className="hover:underline">
                        on <span className="whitespace-nowrap">Google Maps</span>
                      </a>
                    </>
                  ) : null}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
        {curated.map((review) => (
          <figure key={review.quote} className="flex flex-col rounded-2xl border border-line p-6">
            <blockquote className="flex-1 leading-relaxed">“{review.quote}”</blockquote>
            <figcaption className="mt-4 text-sm font-semibold">
              {review.name}
              {review.company ? <span className="font-normal text-muted">, {review.company}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>

      {googleReviews.length > 0 ? (
        <p className="mt-4 text-xs text-muted">
          Google reviews are the ones Google ranks most relevant, shown as written and not filtered by rating.
        </p>
      ) : null}
    </section>
  );
}
