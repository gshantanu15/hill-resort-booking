# Day-two evidence — November 3, 2026

## Units 1–2

- Unit 1 reconciled Day 1 closing evidence and established the atomic checklist in `docs/MASTER_PLAN.md`.
- Unit 2 decisions were explicitly selected by the owner: nightly records; stored booked counter; missing nights unavailable until configured; minimal fields and database safeguards. Rationale and alternatives are in `docs/ARCHITECTURE.md`.
- Implementation: `src/db/schema.ts`, generated `drizzle/0001_nightly_inventory.sql`, journal/snapshot, and isolated PostgreSQL tests in `tests/db/inventory.integration.ts`. No rate/booking/authentication schema or UI added.

## Database verification

- Isolated branch: `unit-2-inventory-tests` / `br-divine-heart-ao9iwkit`, child of development `br-dawn-truth-aoattqdc`; synthetic parent dataset. Branch expires November 4 at 11:20:30 IST. It is not the shared demo branch.
- Existing Neon CLI session was expired; the authenticated Neon connector created the test branch. Connection saved only in ignored `.env.test.local`; direct endpoint used for migrations.
- `npm run test:db`: **19 passed**. Drizzle applied the tracked inventory migration; rerun also verified migration idempotence.
- Checks cover independent room-type/date keys, booked default zero, zero allotment, nonnegative/bounded counts, fractional input parameters, required/null fields, invalid calendar dates, unknown room types, duplicate nights, allotment reductions below booked stock, restricted room-type deletion, and blackout preserving booked quantities.
- Each synthetic fixture is transactionally rolled back, including when a constraint rejects an operation. Test migrations persist on the isolated branch.
- Initial run: 18 passed, one test expected the wrong SQLSTATE for restricted deletion. Updated expectation to PostgreSQL's returned `23001`; rerun passed all 19. No constraint was weakened.
- After isolated verification, `npm run db:migrate` succeeded against the configured development database. No demo migration or inventory seeding was performed.

## Local checks and limits

- TypeScript, ESLint, Prettier, and all 12 existing unit tests passed.
- Production build passed with `npm run build -- --webpack`. Default Turbopack build failed starting the CSS worker for `globals.css`, both sandboxed and outside the sandbox; root cause is not established. No bundler configuration was changed. Carry this default-build failure into Unit 17 validation rather than claiming the normal build passed.
- This proves storage constraints, not overbooking prevention. Availability (including the agreed missing-night behavior), quote logic, booking/counter transactions, retry protection, and concurrency tests remain their scheduled units.
- No browser journey was changed; browser/deployment checks remain Unit 17 work. Units 1–2 are recorded in the commit titled "Implement reviewed nightly inventory storage and Day 2 tracking"; the full-day close remains Unit 17 work.
- Learning: database constraints reject invalid individual inventory states; transactions must later keep booking records and counters consistent across every requested night.
- Next action: discuss Unit 3 rate storage before implementation. Other unresolved business rules remain open in their respective units.

## Unit 3 — Rate storage

- Owner approved "Standard stay", explicit nightly prices per room type/date/plan, no quote/booking for missing prices, an indicative-only catalogue guide, strictly positive prices, and the final minimal schema/safeguards. Decisions and alternatives are recorded in `docs/ARCHITECTURE.md`.
- Added `rate_plans` and `nightly_rates` in `src/db/schema.ts`, generated migration `drizzle/0002_nightly_rates.sql` and its journal/snapshot. No default amount, stored total, package benefits, or tax assumptions introduced. The plan record and nightly seed values remain Unit 5 work.
- Tested on the existing isolated development-child branch `br-divine-heart-ao9iwkit` using its ignored direct test connection. No new branch or credential provisioning was required.
- `npm run test:db`: **42 passed** (23 new rate checks, 19 inventory regressions). Covers nonblank plan identifiers/names, duplicate IDs, required nightly fields, explicit amounts, valid dates/references, positive whole-paise input, unique nightly keys, restricted deletion, invalid updates, pricing independent of inventory, no creation of absent nightly rates, and nightly edits preserving the catalogue guide.
- After isolated verification, `npm run db:migrate` succeeded against development. Shared demo unchanged; no rate data seeded.
- TypeScript, ESLint, 12 existing unit tests, and the production build with `npm run build -- --webpack` passed. Default Turbopack was not rerun; the previously recorded worker failure remains open.
- Catalogue text now says "indicative / night · exact price depends on dates". It does not imply that date selection or exact quoting is already available. Tax treatment remains Unit 8 work.
- Existing desktop/mobile Playwright journeys passed, including the new indicative-label assertion, image loading, navigation, and no horizontal overflow. Screenshots visually inspected. Port 3000 was occupied, so tests used the production build on port 3007 through a temporary ignored config; that file was removed afterward and the test server stopped by Playwright.
- Screenshots: ignored `test-results/home-room-catalogue-is-readable-and-navigable-desktop/catalogue.png` and corresponding `-mobile/catalogue.png`.
- Scope limit: these tests prove storage constraints and catalogue wording, not missing-price quote rejection or booking behavior. Those services remain scheduled work. Unit 3 is complete and included with Unit 4 in the commit titled "Implement reviewed rate and booking storage".
- Learning: price configuration and inventory are independent facts; a sellable stay will require every night to have both sufficient stock and an authoritative configured price.

## Unit 4 — Booking records

- Owner approved confirmed-only booking persistence, required name/email with optional phone, overall and room-type-group adult/child counts, structured nightly snapshots and their fields, one random booking UUID/reference, separate unique submission UUID and SHA-256 request fingerprint, and the final three-table layout/safeguard split. Rationale/alternatives are in `docs/ARCHITECTURE.md`.
- Added `bookings`, `booking_items`, and `booking_nights` to `src/db/schema.ts`; generated `drizzle/0003_booking_records.sql` and journal/snapshot. No status/pending states, duplicate header monetary totals, public write endpoint, or live nightly-price dependency added.
- `npm run test:db`: **78 passed** (36 booking-storage checks plus 42 inventory/rate regressions). Existing isolated branch `br-divine-heart-ao9iwkit` used; fixtures roll back. The first 71-check run passed; review added required-field cases and the final expanded run passed all 78.
- Coverage includes mixed booking records with two room groups/two nights, default UUID/timestamp and optional phone, preserved names/amounts/tax metadata after live edits and live-rate deletion, duplicate keys/submissions, orphan/composite references, restricted deletion, date order, nonblank/required fields, guest counts, positive quantities/prices, whole-paise parameters, and nightly monetary equality.
- Synthetic tax values in the tests demonstrate storage and arithmetic examples only; no actual GST rate or inclusive/exclusive policy was selected. Actual tax rules remain Unit 8 work.
- After isolated verification, `npm run db:migrate` succeeded against development; shared demo unchanged. PostgreSQL reported normal truncation of Drizzle's long generated composite-FK identifier; the constraint was created and its rejection behavior passed integration checks.
- TypeScript, ESLint (no warnings on the final run), formatting/whitespace checks, 12 existing unit tests, and `npm run build -- --webpack` passed. Default Turbopack was not rerun; its earlier worker failure remains open. Build-generated `next-env.d.ts` path churn was removed.
- No UI changed in Unit 4; Unit 3 desktop/mobile evidence remains applicable to the unchanged catalogue. No new browser/deployment checks or booking journey are claimed.
- Limits: local database constraints do not enforce cross-record completeness, guest-allocation sums, night coverage, capacity/age policy, tax-rate/rounding calculations, inventory reservation, fingerprint computation, or idempotent responses. Those must be implemented and tested before exposing booking writes. Snapshot independence from live edits is not a database prohibition on directly editing snapshot rows.
- Unit 4 and the first original Day 2 storage checklist item are complete. Units 3–4 are recorded in the commit titled "Implement reviewed rate and booking storage"; next is Unit 5 seed-data discussion.
- Learning: stored snapshots keep historical confirmation values independent of current catalogue/rates; transactions must later ensure the complete set of booking records agrees with both inventory and the accepted quote.
