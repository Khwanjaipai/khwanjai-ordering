# Khwanjai restaurant ordering · version 1

Next.js App Router, TypeScript, Tailwind CSS, native accessible dialogs, and Resend's email REST API. There are no customer accounts, payments, or automatic LINE notifications.

## Local setup

Use Node.js 24 (pinned in `package.json`). Run `npm ci`, copy `.env.example` to `.env.local` if it does not already exist, and set the email credentials. Run `npm run dev` and open http://localhost:3000.

Public restaurant details are in `config/restaurant.ts`. Call and WhatsApp use the supplied 061-3035176 number. The address is configured. Set `lineUrl` to the actual LINE share link; a phone number is not treated as a LINE ID. Opening hours and the production `siteUrl` are still unset. Pickup and delivery are enabled and should be confirmed by the restaurant.

## Email configuration

Set `RESEND_API_KEY`, `RESTAURANT_ORDER_EMAIL` (the restaurant recipient), and `ORDER_FROM_EMAIL` (a sender on a domain verified in Resend). The recipient can be a normal mailbox. The public `restaurant.email` field is optional contact information and does not override the recipient environment variable.

Never prefix secrets with `NEXT_PUBLIC_`. `.env.local` is ignored and excluded from the source archive. No real email was sent during implementation; provider acceptance and failure were simulated in tests.

## Production protection

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from an Upstash Redis database. They are required for production ordering. Shared storage provides a five-attempts-per-IP-per-ten-minutes limiter, atomic sequential order numbers such as KH-000123, and a 24-hour saved payload for safe email retries. Rate-limit keys contain hashed IP addresses; saved customer orders expire after 24 hours. Keep the database private and do not reset `khwanjai:order-sequence` while using it for the same restaurant.

Local development uses an in-process counter and cache; these reset on restart. Production fails with a friendly error if protection is unconfigured. A honeypot, body-size cap, same-origin check, and strict server validation also protect the endpoint. The IP header is intended for Vercel hosting.

## Menu and checkout

`data/menu.ts` contains all 33 artwork rows: 3 noodle soups, 15 made-to-order rows, 12 salads, and 3 curries/soups. Protein and regular/special choices are restricted to the artwork. Spice is optional on relevant dishes, as requested.

Pad Thai, Rad Na, and Suki show 40–50 THB without an option-to-price mapping. They are visible but require direct contact; the server refuses them in automated checkout. Add their actual option groups and price rules only after the restaurant clarifies them. Unspecified proteins are not added to other dishes.

The cart stores only items/options/notes in session storage, supports item edits and quantities from 1 to 20, and survives reloads and email failures. Checkout collects name, phone, pickup/delivery, delivery location, optional requested time and notes. The server ignores browser prices and calculates totals from the official menu. Food totals do not invent delivery charges; any charges require direct restaurant confirmation.

## Notification architecture

`validateOrder()` → `createOrder()` / `calculateOrderTotal()` → `storeOrReuseOrder()` → `sendOrderNotification()` → `sendOrderEmail()`.

`lib/email.ts` is protected by `server-only`. It waits for a successful Resend response with a provider ID, and sends bilingual item names, quantities, selected choices, item notes, spice, customer information, Bangkok timestamp, requested time and total. Resend receives a stable idempotency key for retries. Success means the provider accepted the email request; it does not assert inbox delivery or restaurant acceptance. The confirmation explicitly says the restaurant will confirm by phone.

To add LINE later, add an adapter behind `sendOrderNotification()`. No cart or checkout rewrite is needed.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. For browser tests, run `npx playwright install chromium`, then `npm run test:e2e`. Browser tests intercept only their own API requests; no mock success switch exists in the deployed application.

The completed checks include 15 logic/API tests and 4 browser scenarios, with responsive layouts at 360, 375, 390, 414, 430, 768 and 1280 px. Origin validation uses the browser-facing Host and external protocol instead of Next.js's internal bind hostname, so both the localhost/127.0.0.1 preview and Vercel's external host work. A real local endpoint check verifies this without sending email. Email tests simulate acceptance, failure, and missing configuration; they do not send messages.

To test a real order, configure recipient and verified sender, run the app, select an unambiguous menu item, complete checkout with a real reachable phone number and a note clearly identifying a TEST ORDER, and submit once. Verify the confirmation, Resend dashboard, and restaurant inbox. Test pickup and delivery separately. To test failure locally, temporarily remove `ORDER_FROM_EMAIL`, submit, and verify that the error retains the cart; then restore it. Never substitute fake credentials in production.

## Vercel deployment

1. Put the source files in a Git repository and import it into Vercel as a Next.js project.
2. Use Node.js 24 and the included lockfile. The build command is `npm run build`; the output directory is the Next.js default.
3. Enter all five server environment variables in the project's environment settings, including Redis. Do not upload `.env.local`.
4. Set the correct LINE link, opening hours, availability and public site URL in `config/restaurant.ts`. Redeploy after changes.
5. Deploy, then send a clearly marked test order and verify its arrival. This implementation has not been deployed.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Resend safe retries](https://resend.com/docs/dashboard/emails/idempotency-keys), [Vercel request headers](https://vercel.com/docs/headers/request-headers).

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact GitHub push commands, Vercel settings, environment variables, and current production requirements.
