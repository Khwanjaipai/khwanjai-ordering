import { test, expect } from "@playwright/test";
test("real local API accepts browser origin and rejects foreign origin without sending email", async ({ request }) => {
  const same = await request.post("/api/orders", { headers: { origin: "http://127.0.0.1:3000" }, data: {} });
  expect(same.status()).toBe(400); expect((await same.json()).error).toBe("Please check your order details.");
  const foreign = await request.post("/api/orders", { headers: { origin: "https://other.example" }, data: {} });
  expect(foreign.status()).toBe(403);
});
test("mobile cart, options, delivery validation, failure preservation and success", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Khwanjai");
  await expect(page.locator(".menu-card")).toHaveCount(33);
  await page.getByRole("button", { name: "Add Boat noodle soup", exact: true }).click();
  await page.getByRole("radio", { name: /Beef/ }).check(); await page.getByRole("radio", { name: /Special/ }).check();
  await page.getByLabel(/Item instructions/).fill("No peanuts");
  await page.getByRole("button", { name: /Add to order/ }).click();
  await expect(page.locator(".sticky-cart")).toContainText("฿45");
  await page.locator(".sticky-cart").getByRole("button", { name: /View Order/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Beef");
  await page.getByRole("button", { name: "Increase Boat noodle soup" }).click(); await expect(page.getByRole("dialog")).toContainText("฿90");
  await page.getByRole("button", { name: "Decrease Boat noodle soup" }).click();
  await page.getByRole("button", { name: /Place Order/ }).click();
  await page.getByLabel(/Customer name/).fill("John Smith"); await page.getByLabel(/Phone number/).fill("0812345678");
  await page.getByRole("radio", { name: /Delivery/ }).check();
  await page.getByRole("button", { name: /Send order/ }).click();
  await expect(page.getByLabel(/Hotel or delivery location/)).toBeFocused();
  await page.getByLabel(/Hotel or delivery location/).fill("XYZ Hotel, Room 7");
  await page.route("**/api/orders", async (route) => { const input = route.request().postDataJSON(); expect(input.customer.orderType).toBe("Delivery"); expect(input.customer.location).toContain("Room 7"); expect(input.items[0].options.size).toBe("special"); expect(input.total).toBeUndefined(); await route.fulfill({ status: 503, json: { error: "We couldn’t send your online order. Please contact Khwanjai directly." } }); });
  await page.getByRole("button", { name: /Send order/ }).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("couldn’t send"); await expect(page.getByRole("heading", { name: "Order sent!" })).toHaveCount(0);
  await page.getByRole("button", { name: /Back to order/ }).click(); await expect(page.getByRole("dialog")).toContainText("No peanuts");
  await page.getByRole("button", { name: /Place Order/ }).click(); await page.getByRole("radio", { name: /Pickup/ }).check(); await expect(page.getByLabel(/Hotel or delivery location/)).toHaveCount(0);
  await page.unroute("**/api/orders"); await page.route("**/api/orders", (route) => route.fulfill({ status: 200, json: { ok: true, orderNumber: "KH-SIMULATED", total: 45 } }));
  await page.getByRole("button", { name: /Send order/ }).click(); await expect(page.getByRole("heading", { name: "Order sent!" })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("The restaurant will confirm your order by phone."); await expect(page.locator(".sticky-cart")).toContainText("0 items");
});
test("editing, removing and reloading preserves valid cart; ambiguous dishes require contact", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: "Add Green curry chicken or pork", exact: true }).click(); await page.getByRole("radio", { name: /Chicken/ }).check(); await page.getByLabel(/Spice level/).selectOption("medium"); await page.getByRole("button", { name: /Add to order/ }).click();
  await page.reload(); await expect(page.locator(".sticky-cart")).toContainText("฿60"); await page.locator(".sticky-cart").getByRole("button", { name: /View Order/ }).click(); await page.getByRole("button", { name: "Edit", exact: true }).click(); await page.getByRole("radio", { name: /Pork/ }).check(); await page.getByRole("button", { name: /Save changes/ }).click(); await page.locator(".sticky-cart").getByRole("button", { name: /View Order/ }).click(); await expect(page.getByRole("dialog")).toContainText("Pork"); await page.getByRole("button", { name: "Remove Green curry chicken or pork" }).click(); await expect(page.locator(".sticky-cart")).toContainText("0 items"); await page.getByRole("button", { name: /Explore the menu/ }).click();
  await page.getByRole("button", { name: "Contact to order Pad Thai", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("does not specify"); await expect(page.getByRole("button", { name: /Add to order/ })).toHaveCount(0);
});
test("all target mobile widths fit and show ordering immediately", async ({ page }) => {
  for (const width of [360,375,390,414,430,768,1280]) {
    await page.setViewportSize({ width, height: 860 }); await page.goto("/");
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth); expect(fits).toBe(true);
    const firstCard = await page.locator(".menu-card").first().boundingBox(); expect(firstCard!.y).toBeLessThan(width <= 430 ? 720 : 810);
    await page.screenshot({ path: `work/screenshots/khwanjai-${width}.png`, fullPage: width === 390 || width === 1280 });
  }
});
