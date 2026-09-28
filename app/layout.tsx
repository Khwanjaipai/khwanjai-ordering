import type { Metadata } from "next";
import "./globals.css";
import { restaurant } from "../config/restaurant";

export const metadata: Metadata = {
  title: "Khwanjai | Authentic Thai Food & Online Ordering",
  description: "Khwanjai ขวัญใจ serves freshly prepared Thai food in Pai with Thai and English menu names. Order online for pickup or local delivery, or contact us by phone, LINE, or WhatsApp.",
  ...(restaurant.siteUrl ? { metadataBase: new URL(restaurant.siteUrl), alternates: { canonical: "/" } } : {}),
  openGraph: { title: "Khwanjai | Authentic Thai Food", description: "อาหารไทยปรุงสดใหม่ · Freshly cooked Thai food in Pai. Order for pickup or delivery.", type: "website", locale: "th_TH", ...(restaurant.siteUrl ? { images: [{ url: "/images/menu/hero/khwanjai-table.png", width: 1536, height: 1024, alt: "Fresh Thai food at Khwanjai" }] } : {}) },
  twitter: { card: "summary_large_image", title: "Khwanjai | Authentic Thai Food", description: "Fresh Thai food made to order in Pai." },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schema = { "@context": "https://schema.org", "@type": "Restaurant", name: restaurant.name, alternateName: restaurant.thaiName, servesCuisine: "Thai", currenciesAccepted: "THB", ...(restaurant.siteUrl ? { url: restaurant.siteUrl, hasMenu: `${restaurant.siteUrl}/#noodles`, image: `${restaurant.siteUrl}/khwanjai-menu.png` } : {}), ...(restaurant.phone ? { telephone: restaurant.phone } : {}), ...(restaurant.address ? { address: restaurant.address } : {}), ...(restaurant.openingHours.length ? { openingHours: restaurant.openingHours } : {}) };
  return <html lang="th"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />{children}</body></html>;
}
