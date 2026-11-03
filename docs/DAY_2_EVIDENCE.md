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
