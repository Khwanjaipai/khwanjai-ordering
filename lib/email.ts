import "server-only";
import { formatOrderEmail, type CreatedOrder } from "./orders";
type EmailConfig = { apiKey?: string; to?: string; from?: string };

export class OrderEmailError extends Error {
  readonly statusCode?: number;
  readonly resendErrorName?: string;
  readonly resendErrorMessage?: string;

  constructor(message: string, details: { statusCode?: number; resendErrorName?: string; resendErrorMessage?: string } = {}) {
    super(message);
    this.name = "OrderEmailError";
    this.statusCode = details.statusCode;
    this.resendErrorName = details.resendErrorName;
    this.resendErrorMessage = details.resendErrorMessage;
  }
}

function providerErrorFields(result: unknown): Pick<OrderEmailError, "resendErrorName" | "resendErrorMessage"> {
  if (!result || typeof result !== "object") return {};
  const record = result as Record<string, unknown>;
  const provider = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : record;
  return {
    resendErrorName: typeof provider.name === "string" ? provider.name : typeof provider.type === "string" ? provider.type : undefined,
    resendErrorMessage: typeof provider.message === "string" ? provider.message : undefined,
  };
}

export async function deliverOrderEmail(order: CreatedOrder, config: EmailConfig, fetcher: typeof fetch = fetch): Promise<string> {
  if (!config.apiKey || !config.to || !config.from) throw new OrderEmailError("Order email configuration is missing.");
  const email = formatOrderEmail(order);
  const response = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `khwanjai-${order.submissionId}` }, body: JSON.stringify({ from: config.from, to: [config.to], ...email }), signal: AbortSignal.timeout(15000) });
  let result: unknown;
  try { result = await response.json(); } catch { result = undefined; }
  if (!response.ok || !result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id) {
    throw new OrderEmailError("Email provider did not accept the order.", { statusCode: response.status, ...providerErrorFields(result) });
  }
  return result.id;
}
export async function sendOrderEmail(order: CreatedOrder): Promise<string> {
  return deliverOrderEmail(order, { apiKey: process.env.RESEND_API_KEY, to: process.env.RESTAURANT_ORDER_EMAIL, from: process.env.ORDER_FROM_EMAIL });
}
export async function sendOrderNotification(order: CreatedOrder): Promise<string> { return sendOrderEmail(order); }
