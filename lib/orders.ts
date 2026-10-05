import { createHash } from "node:crypto";
import { restaurant } from "../config/restaurant";
import { describeOptions, getItemPrice, menu, spiceLevels } from "../data/menu";

export class OrderValidationError extends Error {}
export type OrderItem = { id: string; quantity: number; options: Record<string, string>; spice?: string; instructions: string };
export type Customer = { name: string; phone: string; orderType: "Pickup" | "Delivery"; location: string; requestedTime: string; instructions: string };
export type OrderInput = { submissionId: string; customer: Customer; items: OrderItem[]; website: string };
export type OrderLine = OrderItem & { th: string; en: string; price: number; optionLabels: string[]; spiceLabel?: string };
export type CreatedOrder = { submissionId: string; orderNumber: string; createdAt: string; customer: Customer; lines: OrderLine[]; total: number; fingerprint: string };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderValidationError("Please check your order details.");
  return value as Record<string, unknown>;
}
function field(value: unknown, label: string, max: number, required = false): string {
  if (value !== undefined && typeof value !== "string") throw new OrderValidationError(`Please check ${label}.`);
  const result = (typeof value === "string" ? value : "").trim();
  if ((required && !result) || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) throw new OrderValidationError(`Please check ${label}.`);
  return result;
}
export function validateOrder(value: unknown): OrderInput {
  const input = record(value), customer = record(input.customer);
  const submissionId = field(input.submissionId, "the submission ID", 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) throw new OrderValidationError("Please reopen checkout and try again.");
  const name = field(customer.name, "your name", 100, true), phone = field(customer.phone, "your phone number", 30, true);
  if (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) throw new OrderValidationError("Please enter a valid phone number.");
  const orderType = customer.orderType;
  if (orderType !== "Pickup" && orderType !== "Delivery") throw new OrderValidationError("Please choose pickup or delivery.");
  if ((orderType === "Pickup" && !restaurant.pickupAvailable) || (orderType === "Delivery" && !restaurant.deliveryAvailable)) throw new OrderValidationError("This order type is currently unavailable.");
  const location = field(customer.location, "your delivery location", 300, orderType === "Delivery");
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) throw new OrderValidationError("Please select between 1 and 50 order lines.");
  let count = 0;
  const items = input.items.map((value): OrderItem => {
    const line = record(value), item = menu.find((entry) => entry.id === line.id);
    if (!item) throw new OrderValidationError("An item is no longer available. Please review your order.");
    if (typeof line.quantity !== "number" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new OrderValidationError("Please choose a quantity from 1 to 20.");
    count += line.quantity;
    const rawOptions = record(line.options), options: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawOptions)) { if (typeof value !== "string") throw new OrderValidationError("Please check your item options."); options[key] = value; }
    try { getItemPrice(item, options); } catch (error) { throw new OrderValidationError(error instanceof Error ? error.message : "Please check your item options."); }
    const spice = field(line.spice, "the spice level", 10);
    if (spice && (!item.spicy || !spiceLevels.some((entry) => entry.id === spice))) throw new OrderValidationError("Please check your spice selection.");
    return { id: item.id, quantity: line.quantity, options, spice: spice || undefined, instructions: field(line.instructions, "item instructions", 300) };
  });
  if (count > 100) throw new OrderValidationError("For orders over 100 items, please contact Khwanjai directly.");
  return { submissionId, customer: { name, phone, orderType, location: orderType === "Delivery" ? location : "", requestedTime: field(customer.requestedTime, "the requested time", 100), instructions: field(customer.instructions, "special instructions", 1000) }, items, website: field(input.website, "the form", 100) };
}
export function calculateOrderTotal(lines: Pick<OrderLine, "price" | "quantity">[]): number { return lines.reduce((sum, line) => sum + line.price * line.quantity, 0); }
export function createOrder(input: OrderInput): CreatedOrder {
  const lines = input.items.map((line): OrderLine => {
    const item = menu.find((entry) => entry.id === line.id)!;
    const spice = spiceLevels.find((entry) => entry.id === line.spice);
    return { ...line, th: item.th, en: item.en, price: getItemPrice(item, line.options), optionLabels: describeOptions(item, line.options), spiceLabel: spice ? `${spice.th} / ${spice.en}` : undefined };
  });
  return { submissionId: input.submissionId, orderNumber: `KH-${input.submissionId.toUpperCase()}`, createdAt: new Date().toISOString(), customer: input.customer, lines, total: calculateOrderTotal(lines), fingerprint: createHash("sha256").update(JSON.stringify({ customer: input.customer, items: input.items })).digest("hex") };
}
export function formatOrderEmail(order: CreatedOrder): { subject: string; text: string } {
  const timestamp = new Intl.DateTimeFormat("en-GB", { timeZone: restaurant.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt));
  const orderType = order.customer.orderType === "Pickup" ? "รับที่ร้าน / Pickup" : "จัดส่ง / Delivery";
  const location = order.customer.location || "รับที่ร้าน / Pickup at restaurant";
  const lines = order.lines.map((line) => [`${line.quantity}x ${line.th} / ${line.en}`, ...line.optionLabels, line.spiceLabel ? `ระดับความเผ็ด / Spice: ${line.spiceLabel}` : "", `${line.price} บาทต่อรายการ / THB each`, `${line.price * line.quantity} บาท / THB`, line.instructions ? `หมายเหตุรายการ / Item instructions: ${line.instructions}` : ""].filter(Boolean).join("\n")).join("\n\n");
  return { subject: `ออเดอร์ใหม่ / New Khwanjai Order — ${order.orderNumber} — ฿${order.total}`, text: `ออเดอร์ใหม่ของขวัญใจ\nNEW KHWANJAI ORDER\n\nเลขที่ออเดอร์ / Order #: ${order.orderNumber}\nวันที่และเวลา / Date/Time: ${timestamp} (${restaurant.timezone})\n\nลูกค้า / CUSTOMER\n\nชื่อ / Name: ${order.customer.name}\nโทรศัพท์ / Phone: ${order.customer.phone}\n\nประเภทออเดอร์ / ORDER TYPE\n\n${orderType}\n\nสถานที่ / LOCATION\n\n${location}\n\nเวลาที่ต้องการ / REQUESTED TIME\n\n${order.customer.requestedTime || "โดยเร็วที่สุด / As soon as possible"}\n\nรายการอาหาร / ORDER\n\n${lines}\n\nหมายเหตุพิเศษ / SPECIAL INSTRUCTIONS\n\n${order.customer.instructions || "ไม่มี / None"}\n\nยอดรวม / TOTAL\n\n${order.total} บาท / THB\n\nกรุณาโทรยืนยันออเดอร์กับลูกค้า\nRestaurant must confirm the order by phone.` };
}
