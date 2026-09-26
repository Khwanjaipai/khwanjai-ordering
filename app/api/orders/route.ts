import { NextResponse } from "next/server";
import { createOrder, OrderValidationError, validateOrder } from "../../../lib/orders";
import { sendOrderNotification, OrderEmailError } from "../../../lib/email";
import { allowOrderRequest, RetryConflict, storeOrReuseOrder } from "../../../lib/order-storage";
import { isSameOriginRequest } from "../../../lib/request-origin";
export const runtime = "nodejs";
export const maxDuration = 60;

function redactSecrets(value: string): string {
  return [
    process.env.RESEND_API_KEY,
    process.env.UPSTASH_REDIS_REST_TOKEN,
  ].filter((secret): secret is string => Boolean(secret)).reduce((safe, secret) => safe.split(secret).join("[redacted]"), value);
}

export async function POST(request: Request) {
  let orderNumber: string | undefined;
  let orderId: string | undefined;
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Please submit your order from this website." }, { status: 403 });
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Please check your order." }, { status: 415 });
    if (Number(request.headers.get("content-length") ?? 0) > 32768) return NextResponse.json({ error: "Your order is too large." }, { status: 413 });
    const text = await request.text();
    if (Buffer.byteLength(text) > 32768) return NextResponse.json({ error: "Your order is too large." }, { status: 413 });
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { throw new OrderValidationError("Please check your order details."); }
    const input = validateOrder(payload);
    if (input.website) return NextResponse.json({ error: "Please contact Khwanjai directly." }, { status: 400 });
    // Vercel overwrites this header. Local fallback is for development only.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!await allowOrderRequest(ip)) return NextResponse.json({ error: "Please wait a few minutes before trying again, or contact Khwanjai directly." }, { status: 429, headers: { "Retry-After": "600" } });
    const order = await storeOrReuseOrder(createOrder(input));
    orderNumber = order.orderNumber;
    orderId = order.submissionId;
    await sendOrderNotification(order);
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total: order.total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof RetryConflict) return NextResponse.json({ error: error.message }, { status: 400 });
    const emailError = error instanceof OrderEmailError ? error : undefined;
    const genericError = error instanceof Error ? error : undefined;
    console.error("Order notification failed", {
      errorName: genericError?.name ?? "UnknownError",
      errorMessage: redactSecrets(genericError?.message ?? "Unknown error"),
      statusCode: emailError?.statusCode,
      resendErrorName: emailError?.resendErrorName,
      resendErrorMessage: emailError?.resendErrorMessage ? redactSecrets(emailError.resendErrorMessage) : undefined,
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      hasOrderFromEmail: Boolean(process.env.ORDER_FROM_EMAIL),
      hasRestaurantOrderEmail: Boolean(process.env.RESTAURANT_ORDER_EMAIL),
      senderEmail: process.env.ORDER_FROM_EMAIL,
      recipientEmail: process.env.RESTAURANT_ORDER_EMAIL,
      orderId: orderId ?? orderNumber,
    });
    return NextResponse.json({ error: "We couldn’t send your online order. Please contact Khwanjai directly or try again." }, { status: 503 });
  }
}
