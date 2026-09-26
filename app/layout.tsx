import type { Metadata } from "next";
import "./globals.css";
import { restaurant } from "../config/restaurant";

export const metadata: Metadata = {
  title: "Khwanjai | Authentic Thai Food & Online Ordering",
  description: "Choose freshly cooked Thai food from Khwanjai ขวัญใจ. Browse our bilingual menu, order for pickup or delivery, and receive confirmation by phone.",
  ...(restaurant.siteUrl ? { metadataBase: new URL(restaurant.siteUrl), alternates: { canonical: "/" } } : {}),
  openGraph: { title: "Khwanjai | Authentic Thai Food", description: "อาหารไทยปรุงสดใหม่ · Freshly cooked Thai food. Order for pickup or delivery.", type: "website", locale: "th_TH", ...(restaurant.siteUrl ? { images: [{ url: "/khwanjai-menu.png", width: 1055, height: 1491, alt: "Khwanjai menu" }] } : {}) },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema = { "@context": "https://schema.org", "@type": "Restaurant", name: restaurant.name, alternateName: restaurant.thaiName, servesCuisine: "Thai", currenciesAccepted: "THB", ...(restaurant.siteUrl ? { url: restaurant.siteUrl, hasMenu: `${restaurant.siteUrl}/#noodles`, image: `${restaurant.siteUrl}/khwanjai-menu.png` } : {}), ...(restaurant.phone ? { telephone: restaurant.phone } : {}), ...(restaurant.address ? { address: restaurant.address } : {}), ...(restaurant.openingHours.length ? { openingHours: restaurant.openingHours } : {}) };
  return <html lang="th"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />{children}</body></html>;
}
