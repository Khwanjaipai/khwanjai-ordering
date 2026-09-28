import type { MetadataRoute } from "next";
import { restaurant } from "../config/restaurant";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, ...(restaurant.siteUrl ? { sitemap: `${restaurant.siteUrl}/sitemap.xml` } : {}) };
}
