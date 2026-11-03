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

## Unit 5 — Stock limits and repeatable seed

- Owner selected the fixed 180-night window (November 3, 2026–May 1, 2027), the category/channel split, 10% Friday/Saturday uplift, database-enforced ceilings, no seeded blackouts, and fill-missing-only reruns. Decisions/rationale are in `docs/ARCHITECTURE.md`; original client material remains ignored/local. Functional constants are the selected anonymous demo configuration.
- Added room-type physical/channel limits and a validated nightly ceiling via `0004_channel_stock_limits.sql`. Reviewed data backfill precedes non-null/foreign-key checks. Existing operational fields are not reset; unknown types or unsafe allotments abort migration.
- Added deterministic `src/db/demo-seed.ts` and transactional `src/db/seed.ts`; CLI uses the same implementation. It locks/validates stock, inserts missing rows, and preserves operational data. No booking endpoint or live channel integration added.
- `npm run test:db`: **89 passed**, covering earlier regressions, type/nightly cap checks, forged ceilings, parent-cap cascades, invalid cap reductions, calendar insertion/idempotence, restoring missing rows, preserving edited metadata/prices/allotments/blackouts/booked counters and a booking snapshot, and atomic stock-mismatch rejection. All test fixtures roll back; no seed reset was introduced.
- `npm test`: **15 passed**, including deterministic calendar, unique/bounded dates, exact stock/channel totals, weekday/weekend prices, zero booked/no blackouts for new nights, and nightly seed prices independent of the indicative catalogue guide.
- The existing isolated branch `br-divine-heart-ao9iwkit` was migrated/tested first. CLI seed first run: `{ rooms: 0, plans: 1, inventory: 540, rates: 540 }`; second: all zeros. The temporary ignored seed-test environment was removed afterward; the original test connection file remains ignored.
- Development `npm run db:migrate` succeeded. Development CLI seed first run: `{ rooms: 0, plans: 1, inventory: 540, rates: 540 }`; second: all zeros. Existing room rows were preserved. Shared demo branch was neither migrated nor seeded in this unit.
- TypeScript, ESLint, formatting/whitespace checks, production Webpack build, and both desktop/mobile catalogue checks passed. Catalogue reads explicitly select existing public display fields, avoiding a dependency on operational stock columns during rollout. Browser tests used the production build on port 3007; temporary config removed and server stopped by Playwright. Build-generated type-path churn was removed. Default Turbopack was not rerun; its previously recorded worker issue remains open.
- Unit 5 and the original Day 2 seed checklist item are complete. Changes are uncommitted. Next: Unit 6 stay/occupancy rules. Outside stock is a reserved allowance, not measured outside availability; future staff routes must edit nightly allotment/blackout without accepting physical/channel-cap changes.
- Learning: seeded values establish a repeatable starting point; database relationships enforce stock bounds, and fill-missing-only transactions protect later staff edits. Availability, quotes, reservation concurrency, authentication, and retry services remain pending.

## Units 6–16 — integrated implementation and verification

- Owner approved adults 18+/children 0–17, every guest counting toward capacity, one adult per accommodation unit, no extra beds/exemptions, Asia/Kolkata dates, same-day arrival, 1–14 nights, and inclusive prices. Owner revised Estate seed prices to INR 9,000/9,900. Detailed rules, official tax sources, worked arithmetic, limitations and learning are in BOOKING_RULES.md; implementation rationale/alternatives are in ARCHITECTURE.md.
- Units 6–7: validated real dates, calendar bounds, counts, allocation sums, group capacity, checkout exclusion, and missing inventory/prices. Availability and quotes read consistent snapshots.
- Units 8–9: exact integer-paise inclusive tax extraction, per-unit/night rounding, tax-band gap rejection, complete nightly server quotes, purpose-separated HMAC signatures and 15-minute expiry. Changed/expired quotes return HTTP 409 with a fresh review payload. No stock holds.
- Units 10–11: one transaction locks every selected inventory row in stable order, locks prices, rechecks the signed breakdown, inserts confirmed booking/items/nights and increments counters. Failed payment or any unavailable item writes nothing. Submission advisory locks plus unique keys make concurrent identical retries return one result; changed reuse conflicts.
- Units 12–13: self-managed Better Auth in separate app_* tables, synthetic staff provisioning, disabled signup, eight-hour server sessions, role checks on page/API, protected mutations, cross-origin rejection and logout. Managed neon_auth remains separate. Shared-demo account/profile mutation endpoints are disabled.
- Units 14–16: approved-style calendar editor for a bounded range, per-row inclusive price/allotment/blackout edits, server revalidation and inventory-before-rate locks. Booked/physical/channel counters cannot be edited. Existing confirmations preserve their snapshots after price/blackout changes.
- Final database run: **101 passed** on isolated br-divine-heart-ao9iwkit. Includes real independent-connection last-unit contention, simultaneous duplicate retries, changed submission conflicts, mixed rollback on blackout/missing price, failed payment, invalid/expired quotes, snapshot preservation, and missing inventory/rates/checkout availability. Unique service-test fixtures are committed then removed with scoped cleanup; storage/seed fixtures roll back.
- Final unit run: **35 passed**. Types, ESLint and formatting passed. Standard `npm run build` passed using explicit supported Webpack; the earlier Windows Turbopack CSS-worker failure is worked around, not claimed repaired.
- Browser run: **six passed**, desktop and mobile, against a production build on port 3007 with the isolated test database and independent secret. Covers real browser staff login/calendar/logout; anonymous 401; authenticated guest 403; denied self-role mutation; disabled signup; cross-origin denial; live price invalidating quotes; mixed confirmation; blackout blocking new quotes while confirmed snapshot stays unchanged; invalid edits; and catalogue regression. Test writes restored in finally cleanup. Local screenshots under ignored test-results were visually reviewed. Mobile calendar uses a keyboard-focusable horizontal scrolling region.
- Browser verification found logout needed a JSON request body; corrected and reran successfully. Availability review found missing prices were not included in stock-only responses; corrected and verified, including checkout exclusion. An initial new availability test itself used the wrong exclusive end date; corrected before the final passing run.
- Development migrated through 0006; fill-missing seed rerun inserted zero records; staff provisioned. Shared demo migrated through 0006; inserted one plan plus 540 inventory/540 rate rows and provisioned synthetic staff. The approved price migration only changes matching original baseline values; other configured prices remain untouched.
- No polished guest checkout screen or real payment/channel integration is claimed. Those screens remain Day 3. Operational reset, audit history and accounting/invoice integration remain later scope.

## Unit 17 — release checks in progress

Local verification is complete. Production auth environment configured without exposing the secret; deployment, live smoke results, commit and CI evidence will be appended after verification.
