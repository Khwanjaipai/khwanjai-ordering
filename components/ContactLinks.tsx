import { restaurant } from "../config/restaurant";
export default function ContactLinks({ compact = false }: { compact?: boolean }) {
  const links = [
    { label: "Call / โทร", href: restaurant.phone ? `tel:${restaurant.phone.replace(/[^+\d]/g, "")}` : "", icon: "↗", kind: "call" },
    { label: "LINE / ไลน์", href: restaurant.lineUrl, icon: "L", kind: "line" },
    { label: "WhatsApp", href: restaurant.whatsappNumber ? `https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, "")}` : "", icon: "W", kind: "whatsapp" },
  ];
  return <div className={`contacts ${compact ? "compact" : ""}`} aria-label="Contact Khwanjai">{links.map((link) => link.href ? <a key={link.kind} className={`contact ${link.kind}`} href={link.href} {...(link.kind === "call" ? {} : { target: "_blank", rel: "noopener noreferrer" })}><span aria-hidden="true">{link.icon}</span>{link.label}</a> : <button key={link.kind} type="button" className={`contact ${link.kind}`} disabled title="Restaurant contact details are not configured yet"><span aria-hidden="true">{link.icon}</span>{link.label}</button>)}{links.some((link) => !link.href) && <small className="contact-note">{links.every((link) => !link.href) ? "Contact details will be available soon. / กำลังเพิ่มช่องทางติดต่อ" : "LINE contact will be available soon. / กำลังเพิ่มช่องทาง LINE"}</small>}</div>;
}
