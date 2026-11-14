import type { MetadataRoute } from "next";
import { REQUEST_TYPES } from "@/content/requests";
import { services } from "@/content/services";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    ...services.map((service) => `/${service.slug}`),
    "/find-help",
    "/ordering",
    "/about",
    "/contact",
    ...REQUEST_TYPES.map((type) => `/request/${type}`),
  ];
  return paths.map((path) => ({ url: `${site.url}${path}`, changeFrequency: "monthly" }));
}
