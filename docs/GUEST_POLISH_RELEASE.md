# Development and production release — November 4, 2026

## Released

- Production: https://hill-resort-booking.vercel.app/
- Deployment: dpl_8orH3Ntq1fQsCuCQGgZTkKCD3Y8T, Ready.
- Deployment URL: https://hill-resort-booking-fmpdkhaas-shans-projects-5a3cd5ba.vercel.app
- Development: http://localhost:3000/, running the verified build against the normal development database rather than the temporary regression branch.
- Local restart helper: node output/release/serve-development.mjs. Normal repository development commands continue to use .env.local.

## Safe rollout

Verified the Vercel project and previous production deployment first. Confirmed Neon branch/endpoint identities: development br-dawn-truth-aoattqdc / ep-billowing-term-aoqji16r; production br-icy-thunder-ao36uwx2 / ep-little-snow-ao2w95lu. Both had exactly migrations 0000–0006 with matching source hashes. Only 0007_booking_policy_receipt was pending.

Applied the tested additive migration first to development, then production, using direct connections, lock/statement timeouts and migration-history checks. All three new columns are nullable. Booking, inventory and price snapshots matched immediately before/after each migration. No seeds, resets, row deletion or price edits ran.

Deployment used --prod --skip-domain. The original public domain stayed on the prior release until the staged remote build and API checks passed. Vercel authenticated curl accessed the protected staged URL without disabling protection; Vercel CLI generated its project automation-bypass token for that access. No bypass secret was exposed or committed.

An attempted fresh environment-file download was rejected by automatic approval review as unnecessary secret retrieval. It was not retried or bypassed. Release verification instead used environment-variable names, deployment/Neon metadata, existing authorized local connections, a matching production quote signature and an existing production confirmation. No credentials or environment values were changed.

The upload manifest excludes .env files, private material, output, local caches and agent configuration. Verified 93 runtime files against the deployment manifest; runtime source remains unchanged after deployment. Source fingerprint: 262917b335700e54a848397416a42e379d6dfc4334c8a258901bad931258da43.

## Verification

The release builds on the completed integration checks: 46 unit tests, 105 isolated database regressions, 24 complete desktop/mobile browser regressions, final affected guest checks, types, lint, formatting, production build, secret scan and independent source/screenshot review. See GUEST_POLISH_INTEGRATION_EVIDENCE.md.

- Development desktop/mobile smoke passed on the normal development database.
- Vercel's remote production build, TypeScript and route generation succeeded.
- Staged availability, authoritative mixed-stay quote, existing confirmation, booking shell and new image asset passed before promotion. Four nightly rows total INR 73,000 including GST; subtotal plus included GST equals total. Signature matched the existing production key without downloading it.
- Promoted the checked deployment and verified the production domain resolves to its deployment ID.
- Public production desktop/mobile smoke passed: seven gallery choices without text captions; every image decoded; missing-date feedback; mixed two-room/one-villa selection; optional-phone error/recovery; unselected policy acceptance; draft-document reading; authoritative total; test-outcome switch; and no horizontal overflow or page-script errors.
- Anonymous staff API returned 401. Invalid confirmation reference returned 404.
- An existing persisted production confirmation loaded correctly. Public response excluded contact details, acceptance receipts and retry fingerprints. The unsent email preview showed the persisted reference and stay details, with no download control. No email was sent.
- Browser smoke blocked POST /api/bookings throughout. No booking POST was attempted; release tests created no development or production reservations.
- Final histories show eight migrations in both environments. Development remains 0 bookings / 0 booked unit-nights; production remains 7 bookings / 18 booked unit-nights. Each retains 540 inventory rows. Full inventory and nightly-rate hashes match the pre-release snapshots exactly.

Raw local smoke reports, migration snapshots, screenshots and manifests are ignored under output/release/. Random confirmation references and quote tokens are kept out of this public evidence document.

## Rollback and remaining boundaries

Prior production: dpl_6SuGXrVX8HiN8zPzejhryVEJjcp5, https://hill-resort-booking-9ck7h6l7a-shans-projects-5a3cd5ba.vercel.app. If rollback is needed, promote/rollback to that deployment with Vercel. Keep nullable migration 0007 in place; the prior application remains compatible, so no destructive schema or data rollback is required.

No new booking-write test was run on production. Payment, failure, duplicate submission, stale acceptance and exact old/new retry writes were verified on the isolated regression database. Terms remain the approved non-binding draft; business/contact/retention placeholders are not a completed real-resort policy. Email remains an explicitly labelled example/preview, with no actual delivery. Previously documented moderate Drizzle/esbuild tooling advisories remain; no forced dependency upgrade was included.

No Git commit or push was made; the owner’s earlier working-tree edits remain intact.

## November 5 source closeout

The owner requested a local Git commit of the completed November 4 work and shutdown of project preview/application servers before Day 4. The closeout commit includes this release, its migration, tests, imagery and updated documentation. Earlier statements about uncommitted source or running review servers describe the release-time state. Local servers are stopped for the fresh start; use `npm run dev` to resume normal development. No push or new deployment is part of this closeout. Latest release counts are reconciled in README and MASTER_PLAN; Day 4 remains pending.

Closeout validation reran all 46 unit tests, TypeScript, ESLint, repository formatting and the production Webpack build successfully. Staged files passed whitespace checks and a scan for configured credentials/private keys. The application on port 3000 and old guest mock preview on port 3011 were stopped after verifying their process identities. Ignored screenshot/test evidence, dependencies and environment files are retained; no destructive cleanup or database writes were needed. Database/browser regressions are the November 4 recorded results above, not reruns during this closeout.
