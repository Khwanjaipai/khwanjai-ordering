import { NextResponse } from "next/server";
import { createOrder, OrderValidationError, validateOrder } from "../../../lib/orders";
import { sendOrderNotification } from "../../../lib/email";
import { allowOrderRequest, RetryConflict, storeOrReuseOrder } from "../../../lib/order-storage";
import { isSameOriginRequest } from "../../../lib/request-origin";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
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
    await sendOrderNotification(order);
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total: order.total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof RetryConflict) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Order notification failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "We couldn’t send your online order. Please contact Khwanjai directly or try again." }, { status: 503 });
  }
}
