export type Choice = { id: string; th: string; en: string };
export type OptionGroup = { id: string; th: string; en: string; choices: Choice[] };
export type MenuItem = {
  id: string; category: string; th: string; en: string;
  price?: number; specialPrice?: number; priceRange?: string;
  groups?: OptionGroup[]; spicy?: boolean; clarification?: string;
};
const choice = (id: string, th: string, en: string): Choice => ({ id, th, en });
const pork = choice("pork", "หมู", "Pork"), beef = choice("beef", "เนื้อ", "Beef"), chicken = choice("chicken", "ไก่", "Chicken"), squid = choice("squid", "ปลาหมึก", "Squid"), shrimp = choice("shrimp", "กุ้ง", "Shrimp");
const protein = (...choices: Choice[]): OptionGroup => ({ id: "protein", th: "เนื้อสัตว์", en: "Protein", choices });
const size: OptionGroup = { id: "size", th: "ขนาด", en: "Size", choices: [choice("regular", "ธรรมดา", "Regular"), choice("special", "พิเศษ", "Special")] };
export const categories = [
  { id: "noodles", th: "ก๋วยเตี๋ยว", en: "Noodle Soup", short: "Noodles", number: "01" },
  { id: "made-to-order", th: "อาหารตามสั่ง", en: "Made to Order", short: "Made to Order", number: "02" },
  { id: "salads", th: "ส้มตำและยำ", en: "Som Tam & Salads", short: "Som Tam", number: "03" },
  { id: "curries", th: "แกงและต้ม", en: "Curries & Soups", short: "Curries", number: "04" },
];
const unclear = "The artwork shows 40–50 THB but does not specify the price options. Please contact Khwanjai to order.";
// Transcribed from the supplied menu. Separate rows retain their own prices and choices.
export const menu: MenuItem[] = [
  { id: "boat-noodle", category: "noodles", th: "ก๋วยเตี๋ยวน้ำตก", en: "Boat noodle soup", price: 35, specialPrice: 45, groups: [protein(pork, beef), size] },
  { id: "clear-noodle", category: "noodles", th: "ก๋วยเตี๋ยวน้ำใส", en: "Clear noodle soup", price: 35, specialPrice: 45, groups: [protein(pork, beef), size] },
  { id: "tom-yum-noodle", category: "noodles", th: "ก๋วยเตี๋ยวต้มยำ", en: "Tom yum noodle soup (beef)", price: 50, specialPrice: 60, groups: [size], spicy: true },
  { id: "basil-pork-chicken", category: "made-to-order", th: "กะเพราหมู / ไก่", en: "Basil pork or chicken", price: 40, groups: [protein(pork, chicken)], spicy: true },
  { id: "basil-seafood-beef", category: "made-to-order", th: "กะเพราเนื้อ / ปลาหมึก / กุ้ง", en: "Basil beef / squid / shrimp", price: 50, groups: [protein(beef, squid, shrimp)], spicy: true },
  { id: "fried-rice-pork-chicken", category: "made-to-order", th: "ข้าวผัดหมู / ไก่", en: "Fried rice with pork or chicken", price: 40, groups: [protein(pork, chicken)] },
  { id: "fried-rice-seafood-beef", category: "made-to-order", th: "ข้าวผัดเนื้อ / ปลาหมึก / กุ้ง", en: "Fried rice with beef / squid / shrimp", price: 50, groups: [protein(beef, squid, shrimp)] },
  { id: "crispy-pork-kale", category: "made-to-order", th: "คะน้าหมูกรอบ", en: "Chinese kale with crispy pork", price: 50 },
  { id: "oyster-kale", category: "made-to-order", th: "คะน้าน้ำมันหอย", en: "Chinese kale in oyster sauce", price: 40 },
  { id: "curry-paste", category: "made-to-order", th: "ผัดพริกแกง", en: "Stir-fried curry paste", price: 50, spicy: true },
  { id: "garlic-pork", category: "made-to-order", th: "หมูทอดกระเทียม", en: "Garlic fried pork", price: 50 },
  { id: "pad-thai", category: "made-to-order", th: "ผัดไทย", en: "Pad Thai", priceRange: "40–50", clarification: unclear },
  { id: "rad-na", category: "made-to-order", th: "ราดหน้า", en: "Rad Na", priceRange: "40–50", clarification: unclear },
  { id: "suki", category: "made-to-order", th: "สุกี้", en: "Sukiyaki stir-fry / soup", priceRange: "40–50", clarification: unclear, spicy: true },
  { id: "pad-see-ew", category: "made-to-order", th: "ผัดซีอิ๊ว", en: "Pad See Ew", price: 40 },
  { id: "pork-omelette-rice", category: "made-to-order", th: "ข้าวไข่เจียวหมูสับ", en: "Minced pork omelette with rice", price: 40 },
  { id: "century-egg-basil", category: "made-to-order", th: "กะเพราไข่เยี่ยวม้า", en: "Basil stir-fry with century egg", price: 50, spicy: true },
  { id: "egg", category: "made-to-order", th: "ไข่ดาว / ไข่เจียว", en: "Fried egg / omelette", price: 10, groups: [{ id: "style", th: "เลือกไข่", en: "Egg style", choices: [choice("fried", "ไข่ดาว", "Fried egg"), choice("omelette", "ไข่เจียว", "Omelette")] }] },
  { id: "papaya-salad", category: "salads", th: "ตำไทย / ตำลาว / ตำปูปลาร้า", en: "Thai papaya salad / Lao style / fermented fish", price: 40, groups: [{ id: "style", th: "รูปแบบ", en: "Style", choices: [choice("thai", "ตำไทย", "Thai papaya salad"), choice("lao", "ตำลาว", "Lao style"), choice("fermented-fish", "ตำปูปลาร้า", "Fermented fish")] }], spicy: true },
  { id: "sausage-papaya", category: "salads", th: "ตำหมูยอ", en: "Papaya salad with Vietnamese sausage", price: 50, spicy: true },
  { id: "jungle-papaya", category: "salads", th: "ตำป่า", en: "Jungle papaya salad", price: 60, spicy: true },
  { id: "shrimp-papaya", category: "salads", th: "ตำกุ้งสด / สุก", en: "Papaya salad with fresh or cooked shrimp", price: 100, groups: [{ id: "shrimp-style", th: "กุ้ง", en: "Shrimp preparation", choices: [choice("fresh", "สด", "Fresh shrimp"), choice("cooked", "สุก", "Cooked shrimp")] }], spicy: true },
  { id: "northern-larb", category: "salads", th: "ลาบเมือง", en: "Northern-style spicy minced salad", price: 60, spicy: true },
  { id: "isaan-larb", category: "salads", th: "ลาบอีสาน", en: "Isaan-style larb", price: 60, spicy: true },
  { id: "catfish-larb", category: "salads", th: "ลาบปลาดุก", en: "Catfish larb", price: 60, spicy: true },
  { id: "koi", category: "salads", th: "ก้อย", en: "Koi spicy minced salad", price: 60, spicy: true },
  { id: "herb-salad", category: "salads", th: "ส้า", en: "Spicy herb salad", price: 60, spicy: true },
  { id: "glass-noodle", category: "salads", th: "ยำวุ้นเส้น", en: "Glass noodle salad", price: 60, spicy: true },
  { id: "sausage-salad", category: "salads", th: "ยำหมูยอ", en: "Vietnamese sausage salad", price: 50, spicy: true },
  { id: "grilled-pork-salad", category: "salads", th: "หมูน้ำตก", en: "Spicy grilled pork salad", price: 60, spicy: true },
  { id: "herbal-soup", category: "curries", th: "ต้มขม / ต้มแซ่บ", en: "Spicy herbal soup / spicy Isaan soup", price: 60, groups: [{ id: "style", th: "รูปแบบ", en: "Soup style", choices: [choice("herbal", "ต้มขม", "Spicy herbal soup"), choice("isaan", "ต้มแซ่บ", "Spicy Isaan soup")] }], spicy: true },
  { id: "green-curry", category: "curries", th: "แกงเขียวหวานไก่ / หมู", en: "Green curry chicken or pork", price: 60, groups: [protein(chicken, pork)], spicy: true },
  { id: "coconut-curry", category: "curries", th: "แกงเผ็ดไก่กะทิ", en: "Spicy chicken curry in coconut milk", price: 60, spicy: true },
];
export const spiceLevels = [choice("none", "ไม่เผ็ด", "Not spicy"), choice("mild", "เผ็ดน้อย", "Mild"), choice("medium", "เผ็ดกลาง", "Medium"), choice("thai", "เผ็ดมาก", "Thai spicy")];
export function getItemPrice(item: MenuItem, options: Record<string, string>): number {
  if (item.price === undefined) throw new Error("Please contact the restaurant for this item’s price options.");
  const groups = item.groups ?? [];
  if (Object.keys(options).some((key) => !groups.some((group) => group.id === key))) throw new Error("Unknown menu option.");
  for (const group of groups) if (!group.choices.some((entry) => entry.id === options[group.id])) throw new Error(`Please choose ${group.en.toLowerCase()}.`);
  return options.size === "special" ? item.specialPrice ?? item.price : item.price;
}
export function describeOptions(item: MenuItem, options: Record<string, string>): string[] {
  return (item.groups ?? []).map((group) => { const value = group.choices.find((entry) => entry.id === options[group.id]); return value ? `${value.th} / ${value.en}` : ""; }).filter(Boolean);
}
