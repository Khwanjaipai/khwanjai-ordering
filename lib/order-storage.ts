import "server-only";
import { createHash } from "node:crypto";
import type { CreatedOrder } from "./orders";
const localRates = new Map<string, { count: number; until: number }>();
const localOrders = new Map<string, { order: CreatedOrder; until: number }>();
let localOrderSequence = 0;
export class RetryConflict extends Error {}

type StorageDetails = {
  operation: string;
  requestMethod: string;
  statusCode?: number;
  upstashErrorName?: string;
  upstashErrorMessage?: string;
  causeName?: string;
  causeMessage?: string;
  hasRestUrl: boolean;
  hasRestToken: boolean;
  restUrlBeginsHttps: boolean;
  orderId?: string;
};

export class OrderStorageError extends Error {
  readonly details: StorageDetails;

  constructor(details: StorageDetails) {
    super("Order storage unavailable.");
    this.name = "OrderStorageError";
    this.details = details;
  }
}

function redisConfigured() { return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }

function redactSecrets(value: string): string {
  return [process.env.UPSTASH_REDIS_REST_TOKEN, process.env.RESEND_API_KEY]
    .filter((secret): secret is string => Boolean(secret))
    .reduce((safe, secret) => safe.split(secret).join("[redacted]"), value);
}

function parseResponseBody(text: string): unknown {
  try { return JSON.parse(text) as unknown; } catch { return text ? redactSecrets(text.slice(0, 500)) : undefined; }
}

function providerErrorFields(result: unknown): Pick<StorageDetails, "upstashErrorName" | "upstashErrorMessage"> {
  if (typeof result === "string") return { upstashErrorMessage: result };
  if (!result || typeof result !== "object") return {};
  const record = result as Record<string, unknown>;
  const provider = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : record;
  const error = record.error;
  return {
    upstashErrorName: typeof provider.name === "string" ? provider.name : typeof provider.type === "string" ? provider.type : undefined,
    upstashErrorMessage: typeof error === "string" ? error : typeof provider.message === "string" ? provider.message : undefined,
  };
}

async function redis(operation: string, command: (string | number)[], orderId?: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const baseDetails: Pick<StorageDetails, "operation" | "requestMethod" | "hasRestUrl" | "hasRestToken" | "restUrlBeginsHttps" | "orderId"> = {
    operation,
    requestMethod: "POST",
    hasRestUrl: Boolean(url),
    hasRestToken: Boolean(token),
    restUrlBeginsHttps: typeof url === "string" && url.startsWith("https://"),
    orderId,
  };
  try {
    const response = await fetch(url!, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000), cache: "no-store" });
    const result = parseResponseBody(await response.text());
    if (!response.ok || (result && typeof result === "object" && "error" in result)) {
      throw new OrderStorageError({ ...baseDetails, statusCode: response.status, ...providerErrorFields(result) });
    }
    if (!result || typeof result !== "object" || !("result" in result)) {
      throw new OrderStorageError({ ...baseDetails, statusCode: response.status, upstashErrorMessage: "Unexpected response body from Upstash REST API." });
    }
    return result.result;
  } catch (error) {
    if (error instanceof OrderStorageError) throw error;
    const cause = error instanceof Error ? error : undefined;
    throw new OrderStorageError({ ...baseDetails, causeName: cause?.name ?? "UnknownError", causeMessage: cause ? redactSecrets(cause.message) : "Unknown error" });
  }
}
function requireProductionStorage() { if (process.env.NODE_ENV === "production" && !redisConfigured()) throw new Error("Configure shared order protection before accepting production orders."); }
export async function allowOrderRequest(ip: string): Promise<boolean> {
  requireProductionStorage();
  const key = `khwanjai:rate:${createHash("sha256").update(ip).digest("hex")}:${Math.floor(Date.now() / 600000)}`;
  if (redisConfigured()) {
    const count = await redis("rateLimit", ["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, key, 660]);
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
    const existing = await redis("getExistingOrder", ["GET", key], order.submissionId);
    if (typeof existing === "string") {
      saved = JSON.parse(existing) as CreatedOrder;
      if (saved.fingerprint !== order.fingerprint) throw new RetryConflict("Your order changed. Please reopen checkout to send the updated order.");
      return saved;
    }
    const sequence = Number(await redis("allocateOrderNumber", ["INCR", "khwanjai:order-sequence"], order.submissionId));
    const numbered = { ...order, orderNumber: `KH-${String(sequence).padStart(6, "0")}` };
    await redis("saveOrder", ["SET", key, JSON.stringify(numbered), "EX", 86400, "NX"], order.submissionId);
    const raw = await redis("getSavedOrder", ["GET", key], order.submissionId);
    if (typeof raw !== "string") throw new Error("Could not save order.");
    saved = JSON.parse(raw) as CreatedOrder;
  } else {
    for (const [id, value] of localOrders) if (value.until < Date.now()) localOrders.delete(id);
    const entry = localOrders.get(key) ?? { order: { ...order, orderNumber: `KH-${String(++localOrderSequence).padStart(6, "0")}` }, until: Date.now() + 86400000 }; localOrders.set(key, entry); saved = entry.order;
  }
  if (saved.fingerprint !== order.fingerprint) throw new RetryConflict("Your order changed. Please reopen checkout to send the updated order.");
  return saved;
}
