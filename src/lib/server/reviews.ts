/**
 * Reviews from the business's Google profile, via the Places API.
 *
 * Limits worth knowing:
 * - Google returns at most 5 reviews, the ones it ranks most relevant.
 *   Showing more needs the Business Profile API, which Google must approve.
 * - Google's terms do not allow saving reviews, so they are fetched fresh and
 *   only held in the page cache for an hour.
 * - Each review must show its author, link to the review on Google Maps, and
 *   carry a "Google Maps" attribution. components/Reviews.tsx does this.
 */
import "server-only";


export type GoogleReview = {
  rating: number;
  text: string;
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  when: string;
  url: string | null;
};

export type GoogleReviews = {
  rating: number | null;
  count: number | null;
  /** Link to all reviews on Google Maps. */
  url: string | null;
  reviews: GoogleReview[];
};

type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  googleMapsLinks?: { reviewsUri?: string };
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

const FIELDS = "rating,userRatingCount,googleMapsUri,googleMapsLinks,reviews";

/** Returns null when Google is not connected or the request fails; the page then shows no Google reviews. */
export async function getGoogleReviews(): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return null;

  const base = process.env.GOOGLE_PLACES_BASE_URL ?? "https://places.googleapis.com";
  try {
    const response = await fetch(`${base}/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.error("GOOGLE_REVIEWS_FAILED", response.status);
      return null;
    }
    const place = (await response.json()) as PlaceResponse;
    return {
      rating: place.rating ?? null,
      count: place.userRatingCount ?? null,
      url: place.googleMapsLinks?.reviewsUri ?? place.googleMapsUri ?? null,
      reviews: (place.reviews ?? [])
        .map((review) => ({
          rating: review.rating ?? 0,
          text: (review.text?.text ?? review.originalText?.text ?? "").trim(),
          author: review.authorAttribution?.displayName ?? "Google user",
          authorUrl: review.authorAttribution?.uri ?? null,
          authorPhoto: review.authorAttribution?.photoUri ?? null,
          when: review.relativePublishTimeDescription ?? "",
          url: review.googleMapsUri ?? null,
        }))
        // Reviews with no written text have nothing to show. Nothing is filtered by rating.
        .filter((review) => review.text.length > 0),
    };
  } catch (error) {
    console.error("GOOGLE_REVIEWS_FAILED", error);
    return null;
  }
}
