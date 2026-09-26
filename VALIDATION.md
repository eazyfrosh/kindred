# Validation record

## Crypto/manual payment update — 26 September 2026

- Production build, TypeScript and ESLint passed after the update.
- Nine unit tests passed, including decimal quote rounding, mandatory networks, valid QR paths and terminal payment states.
- Seven Firebase emulator tests passed. Six concurrent manual confirmations produced one campaign credit and one audit event. Unauthorized reviewers and attempts to confirm rejected payments failed. Direct client writes to methods, submissions and audit records, and direct QR uploads, were rejected.
- Windows `tsx` could not read OS user information (`uv_os_get_passwd`), so tests were compiled with TypeScript and run with Node's test runner. Firebase tests ran in an isolated unsigned-in `demo-kindred` emulator configuration. No production payment or wallet was created.
- Case-insensitive repository search returned no references to the removed provider, excluding dependency files, generated Next build output and Git history.
- Payment status filtering requires the new `manualPayments` composite index: `status` ascending, `createdAt` descending (collection scope). Production index deployment and browser/live payment verification were not performed in this update.

Build session: 6 September 2026.

## Passed

| Check                              | Result                                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict check            | `npm run typecheck` passed                                                                                                                                                                                                                                          |
| ESLint / Next.js rules             | `npm run lint` passed, no warnings                                                                                                                                                                                                                                  |
| Next.js production build           | `npm run build` passed                                                                                                                                                                                                                                              |
| Unit tests                         | 6 passed: private receipt tokens, minor units, signature tampering, payment amount/currency/provider matching, donation schema, campaign schema                                                                                                                     |
| Firebase Firestore / Storage rules | 4 emulator tests passed, no skips in emulator run                                                                                                                                                                                                                   |
| Payment ledger integration         | Passed: six concurrent duplicate deliveries settle once; mismatched amounts do not modify totals; separate monthly invoices settle once each; anonymous records omit email/name/message; partial/full refund replay does not double-subtract; over-refunds rejected |
| HTTP smoke checks                  | 21 public/static routes returned success, 3 protected routes redirected to login, 3 mutation guards rejected untrusted-origin or demo writes                                                                                                                        |
| Images                             | All five licensed local photo assets fetched successfully and visually inspected                                                                                                                                                                                    |

Firebase tests used the isolated `demo-kindred` emulator project. No production data or provider account was used. The emulator printed expected permission-denied diagnostics for the deliberately rejected writes. A harmless emulator credential metadata lookup warning occurred; the integration test completed successfully.

Unit-only `npm test` skips the four emulator tests when no emulator is running. `npm run test:emulators` ran those tests separately without skips, followed by the financial ledger integration test.

## Not verified in this session

- Firebase project provisioning, IAM, live composite-index deployment, email delivery, authorized domains, and real Firebase sign-in/upload flows.
- Merchant-account checkout and external webhook delivery for Stripe or Flutterwave; monthly renewals/cancellation against a real test account.
- A live Vercel deployment or custom domain.
- Browser interaction, screen-reader, or viewport screenshot testing. Responsive styles and accessibility semantics are implemented, but browser QA was not requested or performed.
- Experimental WebMCP registry interaction. Discovery navigation is feature-detected; no verified browser registry context was used.

## Launch dependencies and intentionally bounded behavior

- Configure `.env.example`, Firebase rules/indexes, merchant webhooks, billing portal, and the first administrator as described in `README.md`.
- Receipt display/printing works; app-originated email receipts and newsletter delivery need an email integration or provider receipt settings.
- Monthly giving uses Stripe. Other provider adapters support one-time gifts. Automated refund ledger updates are implemented for Stripe; Flutterwave refunds require reconciliation through a reviewed server operation.
- Full-text/fuzzy search is an adapter extension. Live discovery uses a normalized whole-word keyword, category, sort, and cursors. Campaign and user administration use indexed keyword search; other administration lists search the current bounded page, as the interface explicitly labels.
- The operating organization must replace policy templates, fictional content and temporary branding, and establish its payout/refund procedures before launch.

The source is a deployable MVP, not a claim that an unconfigured application has been validated for live financial operations.
