import type { MetadataRoute } from "next";
import { restaurant } from "../config/restaurant";

export default function sitemap(): MetadataRoute.Sitemap {
  return restaurant.siteUrl ? [{ url: restaurant.siteUrl, lastModified: new Date() }] : [];
}
