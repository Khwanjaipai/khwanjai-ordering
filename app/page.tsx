import OrderApp from "../components/OrderApp";
import { categories, menu } from "../data/menu";
import { restaurant } from "../config/restaurant";

export default function Home() {
  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${restaurant.name} menu`,
    hasMenuSection: categories.map((category) => ({ "@type": "MenuSection", name: category.en, alternateName: category.th, hasMenuItem: menu.filter((item) => item.category === category.id).map((item) => ({ "@type": "MenuItem", name: item.en, alternateName: item.th, image: item.image, offers: item.price === undefined ? undefined : { "@type": "Offer", priceCurrency: restaurant.currency, price: item.price } })) })),
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
    ["Do you offer delivery?", "Yes. Choose Delivery at checkout and add your hotel or local delivery location."],
    ["Can I order by phone, LINE, or WhatsApp?", "Yes. Use the contact buttons to reach Khwanjai directly."],
    ["Can I choose spice level?", "Many dishes offer an optional spice level in the item details."],
    ["How do I know my order was received?", "After the email is sent, you’ll see a confirmation. The restaurant will confirm your order by phone."],
  ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })), };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema).replace(/</g, "\\u003c") }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} /><OrderApp /></>;
}
