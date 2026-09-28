import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { categories, getItemPrice, menu } from "../data/menu";
import { createOrder, formatOrderEmail, validateOrder } from "../lib/orders";
import { deliverOrderEmail } from "../lib/email";
import { cartReducer, cartTotal, restoreCart, type CartLine } from "../lib/cart";
import { POST } from "../app/api/orders/route";
import { allowOrderRequest, storeOrReuseOrder } from "../lib/order-storage";
import { isSameOriginRequest } from "../lib/request-origin";

function payload() { return { submissionId: randomUUID(), customer: { name: "John Smith", phone: "081-234-5678", orderType: "Pickup", location: "", requestedTime: "7:00 PM", instructions: "No peanuts" }, website: "", items: [{ id: "basil-seafood-beef", quantity: 2, options: { protein: "shrimp" }, spice: "medium", instructions: "No basil stems" }, { id: "green-curry", quantity: 1, options: { protein: "chicken" }, instructions: "" }, { id: "egg", quantity: 1, options: { style: "fried" }, instructions: "" }] }; }
test("origin validation uses public Host, preserves ports/protocols, and rejects foreign sites", () => {
  const check = (headers: Record<string, string>) => isSameOriginRequest(new Request("http://localhost:3000/api/orders", { headers }));
  assert.equal(check({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }), true);
  assert.equal(check({ host: "localhost:3000", origin: "http://localhost:3000" }), true);
  assert.equal(check({ host: "khwanjai.example", "x-forwarded-proto": "https", origin: "https://khwanjai.example" }), true);
  for (const origin of ["http://127.0.0.1:3001", "https://127.0.0.1:3000", "https://other.example", "null", "http://127.0.0.1:3000/path", "invalid"]) assert.equal(check({ host: "127.0.0.1:3000", origin }), false);
  assert.equal(check({ host: "127.0.0.1:3000", origin: "https://other.example", "x-forwarded-host": "other.example" }), false);
  assert.equal(check({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "sec-fetch-site": "cross-site" }), false);
});
test("artwork menu retains 33 rows, category counts, and exact listed prices", () => {
  assert.equal(menu.length, 33);
  assert.deepEqual(categories.map((category) => menu.filter((item) => item.category === category.id).length), [3,15,12,3]);
  assert.deepEqual(menu.map((item) => item.priceRange ?? (item.specialPrice ? `${item.price}/${item.specialPrice}` : item.price)), ["35/45","35/45","50/60",40,50,40,50,50,40,50,50,"40–50","40–50","40–50",40,40,50,10,40,50,60,100,60,60,60,60,60,60,50,60,60,60,60]);
  assert.deepEqual(menu.find((item) => item.id === "tom-yum-noodle")!.groups!.map((group) => group.id), ["size"]);
});
test("every menu item has a local image asset and descriptive manifest path", () => {
  assert.equal(menu.every((item) => item.image.startsWith("/images/menu/") && existsSync(path.join(process.cwd(), "public", item.image.slice(1)))), true);
});
test("server ignores browser-supplied prices and calculates 170 THB", () => {
  const input = { ...payload(), total: 1, items: payload().items.map((item) => ({ ...item, price: -999 })) };
  const order = createOrder(validateOrder(input));
  assert.equal(order.total, 170); assert.equal(order.lines[0].price, 50);
});
test("every clearly priced option combination resolves to an official price", () => {
  for (const item of menu.filter((item) => item.price !== undefined)) {
    let combinations: Record<string, string>[] = [{}];
    for (const group of item.groups ?? []) combinations = combinations.flatMap((options) => group.choices.map((choice) => ({ ...options, [group.id]: choice.id })));
    for (const options of combinations) assert.equal(getItemPrice(item, options), options.size === "special" ? item.specialPrice : item.price);
  }
});
test("unresolved 40–50 prices cannot be checked out and guessed proteins are rejected", () => {
  for (const id of ["pad-thai","rad-na","suki"]) assert.throws(() => validateOrder({ ...payload(), items: [{ id, quantity: 1, options: {}, instructions: "" }] }));
  assert.throws(() => validateOrder({ ...payload(), items: [{ id: "pad-see-ew", quantity: 1, options: { protein: "shrimp" }, instructions: "" }] }));
});
test("malformed customers, empty orders, invalid quantities and options are rejected", () => {
  for (const input of [null, {}, { ...payload(), customer: null }, { ...payload(), customer: { ...payload().customer, name: " " } }, { ...payload(), customer: { ...payload().customer, phone: "xxx" } }, { ...payload(), customer: { ...payload().customer, orderType: "dine-in" } }, { ...payload(), items: [] }]) assert.throws(() => validateOrder(input));
  for (const quantity of [-1,0,1.5,21,"2"]) assert.throws(() => validateOrder({ ...payload(), items: [{ ...payload().items[0], quantity }] }));
  for (const options of [{}, { protein: "pork" }, { protein: "shrimp", discount: "free" }]) assert.throws(() => validateOrder({ ...payload(), items: [{ ...payload().items[0], options }] }));
});
test("pickup omits location; delivery requires a location", () => {
  assert.equal(validateOrder(payload()).customer.location, "");
  assert.throws(() => validateOrder({ ...payload(), customer: { ...payload().customer, orderType: "Delivery" } }));
  assert.equal(validateOrder({ ...payload(), customer: { ...payload().customer, orderType: "Delivery", location: "XYZ Hotel\nRoom 7" } }).customer.location, "XYZ Hotel\nRoom 7");
});
test("email includes quantities, choices, per-item notes, time, customer and total", () => {
  const order = createOrder(validateOrder(payload())), email = formatOrderEmail(order);
  assert.match(email.subject, /New Khwanjai Order — KH-.* — ฿170/);
  for (const text of ["2x Basil beef / squid / shrimp", "Shrimp", "50 THB each", "100 THB", "No basil stems", "Medium", "No peanuts", "John Smith", "081-234-5678", "7:00 PM", "Asia/Bangkok", "170 THB"]) assert.ok(email.text.includes(text), text);
});
test("cart merges matching choices, updates quantities, edits, removes and restores", () => {
  const line: CartLine = { key: "one", id: "green-curry", options: { protein: "chicken" }, instructions: "", quantity: 1 };
  let cart = cartReducer([], { type: "add", line });
  cart = cartReducer(cart, { type: "add", line: { ...line, key: "two" } }); assert.equal(cart[0].quantity, 2); assert.equal(cartTotal(cart), 120);
  cart = cartReducer(cart, { type: "edit", key: "one", line: { ...line, options: { protein: "pork" }, instructions: "Mild" } }); assert.equal(cart[0].instructions, "Mild");
  assert.equal(restoreCart(JSON.stringify(cart)).length, 1);
  cart = cartReducer(cart, { type: "quantity", key: "one", quantity: 0 }); assert.equal(cart.length, 0);
  assert.deepEqual(restoreCart("not json"), []);
});
test("Resend acceptance requires a provider ID; failures and missing config reject", async () => {
  const order = createOrder(validateOrder(payload())), config = { apiKey: "test-secret", to: "test@example.com", from: "test@example.com" };
  const accepted: typeof fetch = async (_url, init) => { assert.equal(new Headers(init?.headers).get("Idempotency-Key"), `khwanjai-${order.submissionId}`); const body = JSON.parse(String(init?.body)); assert.equal(body.to[0], config.to); return Response.json({ id: "simulated-provider-id" }); };
  assert.equal(await deliverOrderEmail(order, config, accepted), "simulated-provider-id");
  for (const response of [Response.json({ message: "Failure" }, { status: 500 }), Response.json({}), Response.json({ id: "" })]) await assert.rejects(deliverOrderEmail(order, config, async () => response));
  await assert.rejects(deliverOrderEmail(order, {}, accepted));
});
test("API logs safe Resend diagnostics without secrets or authorization headers", async () => {
  const originalFetch = global.fetch, originalError = console.error;
  const apiKey = "test-resend-secret";
  const order = payload();
  process.env.RESEND_API_KEY = apiKey; process.env.RESTAURANT_ORDER_EMAIL = "restaurant@example.com"; process.env.ORDER_FROM_EMAIL = "sender@example.com";
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    global.fetch = async () => Response.json({ error: { name: "validation_error", message: "The sender address is not verified" } }, { status: 422 });
    const response = await POST(new Request("http://localhost/api/orders", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", "x-vercel-forwarded-for": randomUUID() }, body: JSON.stringify(order) }));
    assert.equal(response.status, 503);
    const log = logs.at(-1)![1] as Record<string, unknown>;
    assert.equal(log.errorName, "OrderEmailError"); assert.equal(log.statusCode, 422);
    assert.equal(log.resendErrorName, "validation_error"); assert.equal(log.resendErrorMessage, "The sender address is not verified");
    assert.equal(log.hasResendApiKey, true); assert.equal(log.hasOrderFromEmail, true); assert.equal(log.hasRestaurantOrderEmail, true);
    assert.equal(log.senderEmail, "sender@example.com"); assert.equal(log.recipientEmail, "restaurant@example.com");
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes(apiKey), false); assert.equal(serialized.includes("Authorization"), false); assert.equal(serialized.includes("Bearer"), false);
  } finally {
    global.fetch = originalFetch; console.error = originalError;
    delete process.env.RESEND_API_KEY; delete process.env.RESTAURANT_ORDER_EMAIL; delete process.env.ORDER_FROM_EMAIL;
  }
});
test("safe retries reuse original timestamp and reject changed orders", async () => {
  const input = validateOrder(payload()), order = createOrder(input), saved = await storeOrReuseOrder(order);
  const retried = await storeOrReuseOrder({ ...order, createdAt: "2099-01-01T00:00:00.000Z" }); assert.equal(retried.createdAt, saved.createdAt);
  await assert.rejects(storeOrReuseOrder(createOrder({ ...input, customer: { ...input.customer, name: "Other name" } })));
});
test("rate limiter allows five attempts then blocks", async () => {
  const key = randomUUID(); for (let i = 0; i < 5; i++) assert.equal(await allowOrderRequest(key), true); assert.equal(await allowOrderRequest(key), false);
});
test("production requires shared protection; configured Redis gives short unique numbers and safe retries", async () => {
  const oldEnv = { mode: process.env.NODE_ENV, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }, originalFetch = global.fetch;
  Object.assign(process.env, { NODE_ENV: "production" }); delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    await assert.rejects(allowOrderRequest("production-test"));
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    const values = new Map<string, string>(), counters = new Map<string, number>();
    global.fetch = async (_url, init) => {
      const [command, key, value, ...rest] = JSON.parse(String(init?.body)); let result: string | number | null = null;
      if (command === "GET") result = values.get(key) ?? null;
      if (command === "SET") { assert.ok(rest.includes("EX")); if (!values.has(key)) values.set(key, value); result = "OK"; }
      if (command === "INCR") { result = (counters.get(key) ?? 0) + 1; counters.set(key, result); }
      if (command === "EVAL") { assert.match(key, /EXPIRE/); const rateKey = rest[0]; result = (counters.get(rateKey) ?? 0) + 1; counters.set(rateKey, result); }
      return Response.json({ result });
    };
    const first = createOrder(validateOrder(payload())), stored = await storeOrReuseOrder(first); assert.equal(stored.orderNumber, "KH-000001");
    assert.deepEqual(await storeOrReuseOrder({ ...first, createdAt: "2099-01-01T00:00:00.000Z" }), stored);
    const second = await storeOrReuseOrder(createOrder(validateOrder(payload()))); assert.equal(second.orderNumber, "KH-000002");
    for (let i = 0; i < 5; i++) assert.equal(await allowOrderRequest("unique-production-ip"), true); assert.equal(await allowOrderRequest("unique-production-ip"), false);
  } finally { global.fetch = originalFetch; for (const [name, value] of [["NODE_ENV",oldEnv.mode],["UPSTASH_REDIS_REST_URL",oldEnv.url],["UPSTASH_REDIS_REST_TOKEN",oldEnv.token]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; } }
});
test("API logs safe Upstash diagnostics for REST failures", async () => {
  const originalFetch = global.fetch, originalError = console.error;
  const token = "test-upstash-secret";
  const logs: unknown[][] = [];
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test"; process.env.UPSTASH_REDIS_REST_TOKEN = token;
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    global.fetch = async (_url, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${token}`);
      return Response.json({ error: "WRONGPASS invalid or missing auth token" }, { status: 401 });
    };
    const response = await POST(new Request("http://localhost/api/orders", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", "x-vercel-forwarded-for": randomUUID() }, body: JSON.stringify(payload()) }));
    assert.equal(response.status, 503);
    const log = logs.at(-1)![1] as Record<string, unknown>;
    assert.equal(log.operation, "rateLimit"); assert.equal(log.requestMethod, "POST"); assert.equal(log.statusCode, 401);
    assert.equal(log.upstashErrorMessage, "WRONGPASS invalid or missing auth token");
    assert.equal(log.hasUpstashRestUrl, true); assert.equal(log.hasUpstashRestToken, true); assert.equal(log.restUrlBeginsHttps, true);
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes(token), false); assert.equal(serialized.includes("Authorization"), false); assert.equal(serialized.includes("Bearer"), false);
  } finally {
    global.fetch = originalFetch; console.error = originalError;
    delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
});
test("API rejects foreign origins, wrong content types, oversize requests and honeypot spam", async () => {
  const options = { method: "POST", body: JSON.stringify(payload()) };
  assert.equal((await POST(new Request("http://localhost/api/orders", { ...options, headers: { origin: "https://other.test", "content-type": "application/json" } }))).status, 403);
  assert.equal((await POST(new Request("http://localhost/api/orders", { ...options, headers: { "content-type": "text/plain" } }))).status, 415);
  assert.equal((await POST(new Request("http://localhost/api/orders", { ...options, headers: { "content-type": "application/json", "content-length": "50000" } }))).status, 413);
  assert.equal((await POST(new Request("http://localhost/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload(), website: "bot.test" }) }))).status, 400);
});
test("API success waits for simulated provider acceptance; provider error yields 503", async () => {
  const originalFetch = global.fetch, oldEnv = { key: process.env.RESEND_API_KEY, to: process.env.RESTAURANT_ORDER_EMAIL, from: process.env.ORDER_FROM_EMAIL };
  process.env.RESEND_API_KEY = "test-secret"; process.env.RESTAURANT_ORDER_EMAIL = "test@example.com"; process.env.ORDER_FROM_EMAIL = "test@example.com";
  try {
    global.fetch = async () => Response.json({ id: "simulated-provider-id" });
    const request = () => new Request("http://localhost/api/orders", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", "x-vercel-forwarded-for": randomUUID() }, body: JSON.stringify(payload()) });
    const success = await POST(request()); assert.equal(success.status, 200); assert.equal((await success.json()).total, 170);
    global.fetch = async () => Response.json({ error: "failure" }, { status: 500 }); const failed = await POST(request()); assert.equal(failed.status, 503); assert.equal((await failed.json()).ok, undefined);
    const malformed = await POST(new Request("http://localhost/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: "{" })); assert.equal(malformed.status, 400);
  } finally { global.fetch = originalFetch; for (const [name, value] of [["RESEND_API_KEY", oldEnv.key], ["RESTAURANT_ORDER_EMAIL", oldEnv.to], ["ORDER_FROM_EMAIL", oldEnv.from]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; } }
});
