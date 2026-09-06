# Kindred

An original nonprofit fundraising MVP built with Next.js App Router, TypeScript, React, Tailwind CSS, Firebase Authentication, Firestore, Firebase Storage, Firebase Admin SDK, and provider-hosted payments. The design and campaign text are original; stock photography is credited in `ASSETS.md`.

## Run locally

Requires Node.js 24 (or a Next.js-supported Node version).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`. On PowerShell use `Copy-Item .env.example .env.local`.

`NEXT_PUBLIC_DEMO_MODE=true` gives a clearly labeled, read-only demonstration without Firebase credentials. It never falls back to demo records after a live database error. Authentication and mutations require live configuration; demo checkout never creates a simulated successful payment. Changing a `NEXT_PUBLIC_` variable requires a rebuild.

## Configure Firebase

1. Create a Firebase project with Authentication, Cloud Firestore in native mode, and Storage. Select a region close to the Vercel deployment. Enable billing where required by Firebase.
2. Register a web app and copy all six `NEXT_PUBLIC_FIREBASE_*` values into `.env.local` and Vercel environment settings.
3. Enable Email/Password and Google sign-in. Add the local host and your Vercel/custom domain to Authentication's authorized domains. Configure verification/reset email templates and password policy (the signup UI requires 12 characters).
4. Create a dedicated server service account with the required Firestore, Authentication administration, and Storage permissions. Store `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` only in server environment variables. Escaped `\n` in the private key is supported. Never commit the key.
5. Set `NEXT_PUBLIC_SITE_URL` to the exact origin users visit, without a trailing slash. It controls CSRF checks, callbacks, canonical links, and metadata. Local default: `http://127.0.0.1:3000`.
6. Generate a random `RATE_LIMIT_SALT` (32 bytes or more). Firestore-backed limits require it. Vercel's trusted forwarding header is used in production; non-Vercel execution shares the local limit bucket. Add a trusted proxy adapter if deploying elsewhere.
7. Set `NEXT_PUBLIC_DEMO_MODE=false` and restart/rebuild.
8. Deploy rules and indexes using the Firebase CLI:

```sh
npx firebase login
npx firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,firestore:indexes,storage
```

Allow indexes to finish building. Enable TTL for `_rateLimits.expiresAt` if the CLI does not provision it automatically. TTL is cleanup only; the limiter uses time buckets and does not depend on deletion timing.

Create an account through the site, then bootstrap the first administrator from a trusted machine:

```sh
npm run admin:grant -- FIREBASE_USER_UID
```

Sign in again. Roles are read from server-owned `users/{uid}` records, not browser fields. Subsequent administrators can manage roles in `/admin`. Administrators cannot demote or disable themselves from the UI.

## Payment configuration

The app collects a donation amount and donor details, then redirects to provider-hosted checkout. Card numbers, CVVs, and raw card credentials are never handled by the app or stored in Firebase.

| Provider    | Server variables                                       | Webhook route                       |
| ----------- | ------------------------------------------------------ | ----------------------------------- |
| Stripe      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`           | `/api/payments/webhook/stripe`      |
| Paystack    | `PAYSTACK_SECRET_KEY`                                  | `/api/payments/webhook/paystack`    |
| Flutterwave | `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` | `/api/payments/webhook/flutterwave` |

Alternatively, set `PAYMENT_PROVIDER` plus `PAYMENT_PROVIDER_SECRET` and `PAYMENT_WEBHOOK_SECRET` for one provider. Explicit provider variables take precedence. Only configured providers appear in live checkout.

- **Stripe:** Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, and `charge.refunded`. Configure Stripe's customer billing portal with cancellation enabled. Monthly donors must sign in; `/dashboard?tab=donations` opens the portal. Do not enable discounts, manual paid invoices, or changing subscription prices outside the platform's donation contract.
- **Paystack:** Configure the webhook URL. Signature verification uses HMAC-SHA512 with the Paystack secret key; successful events are re-verified using the transaction verification API. Enable the required currencies in your merchant account.
- **Flutterwave:** Uses v3 hosted payments and transaction verification. Configure raw-body HMAC-SHA256 / base64 webhooks in the `flutterwave-signature` header. Legacy `verif-hash` payloads are intentionally rejected; confirm your account's webhook format before enabling it. Enable webhook retries.
- Monthly giving is implemented through Stripe. Paystack and Flutterwave adapters support one-time donations.
- One-time Stripe checkout uses a PaymentIntent ID for deduplication; recurring payments use the invoice ID. Firestore transactions atomically record the donation, update totals, create public redacted donor entries, and notify the organizer. Provider transaction markers prevent replay across donation references.
- Stripe refunds update net totals idempotently, including monthly invoices resolved through Invoice Payments. Paystack/Flutterwave refund automation is not enabled; reconcile those refunds through a reviewed server operation before reporting net totals. Refund initiation occurs in the provider dashboard, not through a browser-admin “mark paid” control.
- The success URL does not confirm payment. Receipt pages show pending until a signed, verified webhook settles it. Receipts are printable or can be saved as PDF using the browser. Guest receipt links contain a random bearer token, carry a no-referrer policy, and must be kept private.
- Receipt display is implemented. App-originated receipt emails and newsletter delivery need an email service integration; provider receipt emails can be enabled in the provider dashboard.

Use provider test keys and staging Firebase first. Test real provider sandbox checkout, webhook retries, monthly renewal/cancellation, and refunds with your configured merchant accounts before switching to live keys. These account-specific calls cannot be verified without your credentials.

## Deploy to Vercel

1. Push the `kindred` directory as the repository root, or select it as Vercel's Root Directory.
2. Select the Next.js framework preset and Node 24. Build command: `npm run build`; install command: `npm ci`. No custom output directory is required.
3. Set the environment values above, set `NEXT_PUBLIC_DEMO_MODE=false`, and set the exact production `NEXT_PUBLIC_SITE_URL`.
4. Deploy Firebase rules/indexes before enabling writes. Configure provider webhooks against the final HTTPS domain.
5. Enable Firebase authorized domains and test account verification, uploads, campaign approval, donations, receipts, and administrator access in staging.
6. Finalize the nonprofit identity, contact address, legal policies, refund terms, real team/supporter records, and organizational disclosures before inviting real donors. The supplied privacy/terms pages are explicitly marked policy templates.

This is a Node-runtime Next.js application. Firebase Admin uses server-side APIs that are not packaged for Cloudflare Sites. No Cloudflare deployment or live Vercel deployment is claimed. A deployment-ready source project is the deliverable; Vercel and Firebase accounts must be configured by the operator.

## Features and routes

- `/`: original branded homepage, campaign features, animated figures, mission, stories, illustrative donation impact, testimonials, supporter names, newsletter and volunteer CTA.
- `/causes`: server-backed keyword/category discovery, recent/most-funded/almost-funded/urgent ordering, cursor pagination. “Most funded” compares nominal campaign amounts; review the displayed currency when comparing currencies.
- `/campaign/[slug]`: story with Markdown, reviewed status, sticky donation card, updates, gallery, public donor feed, moderated comments, allocation, organizer, save/share, related causes, metadata and structured data.
- `/donate/[id]`, `/donation/success`: three-step giving, one-time/monthly support, hosted checkout, private printable receipts.
- `/start-a-fundraiser`: authenticated, email-verified six-step wizard, uploads, Markdown preview, allocation and submission review.
- `/about`, `/how-it-works`, `/impact`, `/volunteer`, `/contact`, `/privacy`, `/terms`.
- `/login`, `/signup`, `/forgot-password`: Firebase email/password, Google, verification and recovery.
- `/dashboard`: donation history/receipts, lifetime giving by currency, saved causes, fundraiser status, allowed edits, updates/images, redacted recent donors, view/share counts, closure requests, notifications, profile and subscription management.
- `/admin`: server-authorized overview, lifetime/daily/monthly revenue, user growth, category revenue, campaign performance; campaign review/edit/feature/suspend/complete/delete; donation status filters; user roles/access/verification/history; volunteer statuses/notes; inbox; comment moderation; structured website content editing.

## Data and permissions

Shared models are in `types/`; schemas in `lib/validation.ts`; server services in `services/`; client/server Firebase initialization in `firebase/`; authorization in `lib/security.ts`.

Collections: `users`, `campaigns`, `donations`, `publicDonations`, `campaignUpdates`, `comments`, `volunteerApplications`, `contactMessages`, `newsletterSubscribers`, `notifications`, `siteSettings`. The content editor stores testimonials, partners, FAQs, team and announcements in `siteSettings/public`; standalone testimonial/partner rule paths are reserved for later migration.

Internal collections: `_paymentTransactions`, `_campaignDonors`, `_donors`, `_userCampaigns`, `_userStats`, `_revenuePeriods`, `_billingCustomers`, `_subscriptions`, `_rateLimits`, `_auditLog`. Clients cannot access these collections. Financial amounts use integer minor units at provider boundaries; the supported currencies all use two decimal places. Display amounts are decimal major units. Never aggregate unlike currencies without an explicit exchange-rate policy.

All privileged writes go through server routes. Firestore clients can only change allowed profile-name fields. Owners edit eligible campaigns through the authenticated server endpoint; published campaigns retain their story and use updates. Funded campaigns or campaigns with any payment intent cannot be deleted. Profile roles, email verification, payment status, approval and donation totals are never accepted from browser data.

Storage paths: `campaigns/{uid}/{uuid}.{jpg|png|webp}`, `profiles/{uid}/{uuid}.{ext}`, and reserved private `organizations/{uid}/{file}.pdf`. Creation requires ownership, an active account, validated MIME/size, and email verification for campaign/organization files. SVG/HTML uploads are rejected. Campaign file updates/deletes are disabled to preserve reviewed media. Published Firebase download URLs are bearer URLs; do not use them for sensitive organization documents. An organization-document upload UI is not included because documents are optional.

Search is isolated in `services/campaigns.ts` behind `SearchOptions`. Live keyword matching uses the first normalized whole-word token in a Firestore index; it is not fuzzy or full-text search. Replace that adapter with Algolia for multiword relevance, typo tolerance, and large-scale ranking. Public queries are paginated, and no collection-wide realtime subscriptions are used. Campaign and user administration use indexed keyword searches across records. Other administrative lists explicitly label their local search as “Search this page”; browse/filter pages for older records. User campaign and notification lists are bounded to 50 and 30 respectively.

## Development seed

Set `SEED_PROJECT_CONFIRM` to the exact development project ID, then run:

```sh
npm run seed
```

The script never overwrites existing records and never fabricates confirmed financial transactions. It creates fictional campaigns with zero raised amounts and zero donors. Replace fictional organizers and stock content before publication. Demo visual totals live only in the explicit read-only demonstration.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Requires Java 21; uses only demo-kindred
npm run test:emulators
```

Unit tests cover money conversion, signature tampering, exact amount/currency/provider matching, and form validation. Emulator tests cover public/private access, role escalation, forged totals/payments, ownership and upload restrictions. The ledger integration test exercises concurrent duplicate webhook settlement, mismatched amounts, recurring invoices, anonymous-data redaction, and campaign totals. CI runs these checks on Node 24 and Java 21.

No real Firebase project, real provider credentials, or Vercel deployment was available in this build session. Browser interaction testing was not requested or performed. WebMCP discovery navigation is feature-detected, but the experimental registry was not verified in a supported browser context. See `VALIDATION.md` for the actual checks run.

## Operational follow-up

Use provider webhook delivery logs and retry failed deliveries. Reconcile the donation ledger against provider exports, including pending transactions and refunds. Set Firebase budgets, least-privilege IAM, backups, retention, and monitoring appropriate to the organization. The app does not distribute funds to third-party organizers; funds settle to the configured merchant account. Marketplace payouts would require a separate provider Connect/subaccount design and onboarding process.

Manage active monthly subscriptions when suspending or closing campaigns: future subscription charges are existing donor agreements, so campaign suspension alone does not cancel them. Cancel in Stripe or coordinate with donors through the portal. The webhook still records already-paid installments even if the campaign is no longer public.

## Rebrand

Start with `lib/brand.ts`, the CSS variables in `app/globals.css`, `components/navigation.tsx`, and `public/icon.svg`. Replace public copy and demo content. Blue `#193be0`, citron `#d5f563`, and ink `#162333` define the visual system. All photographed people are illustrative stock subjects, not asserted beneficiaries or endorsers.
