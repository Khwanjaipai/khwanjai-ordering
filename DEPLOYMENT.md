# Vercel deployment preparation

The current site is prepared for GitHub and Vercel import. No design or customer-facing changes were made during this preparation. Nothing has been pushed or deployed, and no DNS settings were changed.

## Project settings

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root (`.`) |
| Node.js version | 24.x, pinned in `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Leave Vercel's Next.js default unchanged |
| Production branch | `main` |

This application uses the Next.js App Router and a Node.js API route at `/api/orders`. Resend and Upstash are called over HTTPS. Production order storage is shared through Upstash; the development-only in-memory fallback is not used in production. No writable local files or persistent server process are required by the production endpoint. Vercel supports the framework, route handlers and Node.js 24. No extra `vercel.json`, static-export setting, or manual route rewrites are necessary.

## Environment variables

Add all five variables below in Vercel's project environment settings before running the ordering flow. Set them for Production and, if testing previews, Preview. Enter the actual values privately in Vercel; do not commit them.

| Variable | What to enter |
| --- | --- |
| `RESEND_API_KEY` | Your Resend sending API key |
| `RESTAURANT_ORDER_EMAIL` | `heirvoapp@gmail.com` for your current testing; replace later with the restaurant mailbox if needed |
| `ORDER_FROM_EMAIL` | `Khwanjai Test Orders <onboarding@resend.dev>` for testing to the same Resend account email; use a verified-domain sender for restaurant production email |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST URL from your Upstash Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | REST token for that database |

Both Upstash settings are mandatory in production for spam protection, sequential order numbers and safe retries. The site builds without them, but submitting orders will show a friendly failure until they are configured. Use a separate Redis database for Preview if you want to avoid sharing production order numbers and rate limits during testing.

Vercel supplies `NODE_ENV`; do not add it manually. No `NEXT_PUBLIC_` environment variables or LINE API credentials are required. `.env.example` contains only empty assignments for the five required names. Your existing local `.env.local` remains on your machine and is ignored by Git.

## GitHub push commands

Create a new **empty** GitHub repository named `khwanjai-ordering`, owned by your GitHub user or organization. Do not initialize it with a README, license or `.gitignore`: the local repository already contains the source and its initial commit.

Run these commands in PowerShell. The prompt lets you enter the correct GitHub username or organization without editing a placeholder URL:

```powershell
Set-Location 'C:\Users\Admin\Documents\Codex\2026-09-26\order-delivery-version-1-for-the'
$githubOwner = Read-Host 'GitHub username or organization that owns khwanjai-ordering'
git remote add origin "https://github.com/$githubOwner/khwanjai-ordering.git"
git push -u origin main
```

Authenticate through Git's normal GitHub sign-in when prompted. Do not paste a token into a remote URL. If you choose a different repository name, change `khwanjai-ordering` in the URL to match it. No remote has been configured or pushed by this preparation.

## Import into Vercel when you are ready

After pushing, choose Add New Project in Vercel and import the GitHub repository. Use the settings above and add all five environment variables. Only select Deploy when you want to publish the site. No DNS change is needed to use the generated `vercel.app` URL.

Before accepting real customer orders, configure the remaining restaurant information in `config/restaurant.ts`: the LINE share link, opening hours and final site URL. Confirm pickup/delivery availability and the unresolved 40–50 THB menu choices. These settings were deliberately not changed during deployment preparation. Your current Call and WhatsApp details remain intact.

The sender still uses Resend's test domain locally. It is appropriate for your account inbox test, but not a verified restaurant sender for general production recipients. No new test email was sent during this preparation.

## Checks and exclusions

The production build, TypeScript checks, lint and 15 logic/API tests pass. The build emits a static home page and a dynamic `/api/orders` route. The site design and behavior were not changed.

Git ignores `.env*` except `.env.example`, `node_modules/`, `.next/`, `.vercel/`, logs, intermediate `work/`, generated `outputs/`, Playwright artifacts and TypeScript caches. The initial commit is checked against the actual local credential values and common credential patterns. Client build files are also checked for the actual local credential values. Local env files are not tracked or committed.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Resend email API](https://resend.com/docs/api-reference/emails/send-email).
