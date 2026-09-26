// Public restaurant information only. Never put API keys here.
export const restaurant = {
  name: "Khwanjai",
  thaiName: "ขวัญใจ",
  tagline: "Authentic Thai Food",
  phone: "+66613035176", // 061-3035176 in international format.
  whatsappNumber: "66613035176", // Country code and digits only.
  lineUrl: "", // Official account URL or https://line.me/... link.
  email: "", // Public contact address. Order recipient is RESTAURANT_ORDER_EMAIL.
  openingHours: [] as string[], // Schema.org format, e.g. Mo-Su 11:00-21:00.
  address: "7FW8+GM2, Mae Hi, Pai District, Mae Hong Son 58130, Thailand",
  siteUrl: "", // HTTPS production URL for canonical links and JSON-LD.
  pickupAvailable: true,
  deliveryAvailable: true,
  currency: "THB",
  timezone: "Asia/Bangkok",
} as const;
