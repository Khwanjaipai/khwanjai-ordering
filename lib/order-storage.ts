import "server-only";
import { createHash } from "node:crypto";
import type { CreatedOrder } from "./orders";
const localRates = new Map<string, { count: number; until: number }>();
const localOrders = new Map<string, { order: CreatedOrder; until: number }>();
let localOrderSequence = 0;
export class RetryConflict extends Error {}
function redisConfigured() { return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }
async function redis(command: (string | number)[]) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, { method: "POST", headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error("Order storage unavailable.");
  return result.result;
}
function requireProductionStorage() { if (process.env.NODE_ENV === "production" && !redisConfigured()) throw new Error("Configure shared order protection before accepting production orders."); }
export async function allowOrderRequest(ip: string): Promise<boolean> {
  requireProductionStorage();
  const key = `khwanjai:rate:${createHash("sha256").update(ip).digest("hex")}:${Math.floor(Date.now() / 600000)}`;
  if (redisConfigured()) {
    const count = await redis(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, key, 660]);
    return Number(count) <= 5;
  }
  for (const [id, value] of localRates) if (value.until < Date.now()) localRates.delete(id);
  const entry = localRates.get(key) ?? { count: 0, until: Date.now() + 660000 }; entry.count++; localRates.set(key, entry);
  return entry.count <= 5;
}
export async function storeOrReuseOrder(order: CreatedOrder): Promise<CreatedOrder> {
  requireProductionStorage();
  const key = `khwanjai:order:${order.submissionId}`;
  let saved: CreatedOrder;
  if (redisConfigured()) {
    const existing = await redis(["GET", key]);
    if (typeof existing === "string") {
      saved = JSON.parse(existing) as CreatedOrder;
      if (saved.fingerprint !== order.fingerprint) throw new RetryConflict("Your order changed. Please reopen checkout to send the updated order.");
      return saved;
    }
    const sequence = Number(await redis(["INCR", "khwanjai:order-sequence"]));
    const numbered = { ...order, orderNumber: `KH-${String(sequence).padStart(6, "0")}` };
    await redis(["SET", key, JSON.stringify(numbered), "EX", 86400, "NX"]);
    const raw = await redis(["GET", key]);
    if (typeof raw !== "string") throw new Error("Could not save order.");
    saved = JSON.parse(raw) as CreatedOrder;
  } else {
    for (const [id, value] of localOrders) if (value.until < Date.now()) localOrders.delete(id);
    const entry = localOrders.get(key) ?? { order: { ...order, orderNumber: `KH-${String(++localOrderSequence).padStart(6, "0")}` }, until: Date.now() + 86400000 }; localOrders.set(key, entry); saved = entry.order;
  }
  if (saved.fingerprint !== order.fingerprint) throw new RetryConflict("Your order changed. Please reopen checkout to send the updated order.");
  return saved;
}
