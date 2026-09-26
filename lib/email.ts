import "server-only";
import { formatOrderEmail, type CreatedOrder } from "./orders";
type EmailConfig = { apiKey?: string; to?: string; from?: string };
export async function deliverOrderEmail(order: CreatedOrder, config: EmailConfig, fetcher: typeof fetch = fetch): Promise<string> {
  if (!config.apiKey || !config.to || !config.from) throw new Error("Order email configuration is missing.");
  const email = formatOrderEmail(order);
  const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `khwanjai-${order.submissionId}` }, body: JSON.stringify({ from: config.from, to: [config.to], ...email }), signal: AbortSignal.timeout(15000) });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) throw new Error("Email provider did not accept the order.");
  return result.id;
}
export async function sendOrderEmail(order: CreatedOrder): Promise<string> {
  return deliverOrderEmail(order, { apiKey: process.env.RESEND_API_KEY, to: process.env.RESTAURANT_ORDER_EMAIL, from: process.env.ORDER_FROM_EMAIL });
}
export async function sendOrderNotification(order: CreatedOrder): Promise<string> { return sendOrderEmail(order); }
