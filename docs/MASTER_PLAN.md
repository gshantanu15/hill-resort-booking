# Hill Resort Booking — Six-Day Master Plan

**Dates:** November 2–7, 2026  
**Availability:** 4–6 focused hours per day  
**Delivery bar:** deployed, reviewable core demo  
**Status:** implementation in progress

Use this file as the daily record. A checkbox is complete only when behavior works and evidence is recorded (commit, test result, screenshot, or deployment URL). The original client brief is a local source of truth and must never enter the public repository.

## Agreed scope

The demo lets a guest browse rooms and villas, choose dates, see availability and itemized prices, book mixed room types, complete simulated payment, and receive confirmation. Staff can use a seeded email/password demo login, manage nightly rates, website allotment and blackout dates, and review web, simulated email, and simulated WhatsApp enquiries. OpenRouter classifies enquiries, extracts dates/guests/budget, assigns an owner, and drafts an editable reply.

Deferred: real payments, real messaging, reservation-system/channel-manager integration, promo codes, daily exports, dedicated event-form workflows, guest accounts, cancellation/refund workflows, and production launch certification.

## Technical contracts and working rules

- Next.js, TypeScript, Tailwind, Neon PostgreSQL, Drizzle, Better Auth, OpenRouter, Vercel, Vitest, and Playwright are the approved baseline.
- One booking has one contact, shared check-in/check-out dates, guest counts, and one or more room-type quantities. Checkout day consumes no inventory.
- Money is integer paise. Server-side quotes include nightly prices, taxes, quantities, and the confirmed breakdown.
- Confirmation rechecks price and availability and atomically reserves every requested room type and night. Lock inventory in stable order; insufficient stock rolls back all items. A unique submission id prevents duplicate retries.
- Staff cannot reduce allotment below booked inventory. Blackouts stop new sales without invalidating existing bookings.
- Enquiries are persisted before AI processing. AI returns category, extracted fields, uncertainty indicators, and draft. Complaints always flag GM attention. Failed or low-confidence AI results remain manual-review items.
- Staff can reroute and edit drafts. Drafts are never sent automatically. Prices in drafts come from the rate table, not the model.
- You own architecture, scope, design direction, services, and consequential decisions. AI executes bounded implementation and verification within those decisions.
- End each day with a demo, checks, commit, checkbox updates, evidence, blockers, and next action. If time runs short, preserve inventory correctness, authentication, booking, and AI manual fallback before secondary polish.

## Day 1 — Monday, November 2: Foundation and first deployment

**Goal:** establish the project, document decisions, and prove the app can run locally and online.

- [x] Save the original brief locally at `private/hill_resort_client_brief.md` and exclude it from Git. **Evidence:** `private/` is ignored by `.gitignore`; original file remains local.
- [x] Create the public GitHub repository and initial documentation. **Evidence:** local repository initialized; public repository: https://github.com/gshantanu15/hill-resort-booking.
- [x] Create the master-plan checklist, sanitized public requirements, and architecture decision record. **Evidence:** `docs/MASTER_PLAN.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`.
- [x] Scaffold Next.js/TypeScript/Tailwind; configure formatting, types, tests, and CI. **Evidence:** `package.json`, config files, `.github/` workflow; local checks and initial GitHub CI passed.
- [x] Establish Neon development and demo database environments, migrations, and repeatable synthetic seed data. **Evidence:** both branches migrated and seeded; see docs/DAY_1_EVIDENCE.md.
- [x] Configure Vercel deployment and environment variables; commit an example env file containing names only. **Evidence:** https://hill-resort-booking.vercel.app returns the database-backed catalogue. GitHub repository link verified; production branch main.
- [x] Configure OpenRouter access with Gemma as primary and the owner-approved free Dots fallback; use the approved 50/day and 20/min upstream quotas instead of a paid budget. **Evidence:** authentication and all four live classifications passed through the actual fallback route; see docs/OPENROUTER.md. Both models configured locally and on Vercel.
- [x] Agree a compact visual direction: fictional coffee-estate identity, restrained palette, typography, licensed photography, and mobile layout. **Evidence:** owner approval on November 2; root DESIGN.md and shared tokens saved; see docs/DESIGN_REVIEW.md.
- [x] Build the application shell and demonstrate a database-backed room listing. **Evidence:** live public catalogue and passing desktop/mobile checks.

**Done when:** a fresh checkout has documented setup, CI passes, a deployed URL renders seeded rooms, and no credentials, original brief, or private client material is public.

**Status:** complete. The November 2 closing review passed all exit criteria; see [Day 1 closing evidence](DAY_1_EVIDENCE.md#closing-review--november-2-2026). Reconciled on November 3 from that review; these checks were not rerun during reconciliation.

## Day 2 — Tuesday, November 3: Inventory, pricing, and staff access

**Goal:** build and test the rules that make displayed availability trustworthy.

### Atomic work units

Owner-approved sequence, November 3. Work on one unit at a time and review its evidence before advancing. The original Day 2 acceptance checklist below remains authoritative; mark its parent items complete only when all corresponding units pass.

Every turn: identify the active unit, discuss any consequential decision or unresolved business rule before dependent implementation, implement only the bounded unit, run relevant checks, and update this checklist with evidence, blockers, and the next action. Planning-only turns report updates in chat until file edits are allowed. Discussion alone does not complete implementation.

For each decision, explain the recommendation, rationale, meaningful alternatives and their tradeoffs, and why they fit this project less well. The owner chooses unresolved business rules and consequential technical choices; record decisions in `docs/ARCHITECTURE.md`. Earlier suggested defaults are not approvals. End each unit with what changed, why, what the checks prove, and a short learning note.

- [x] **Unit 1 — Reconcile Day 1 and establish tracking.** Correct stale closing status and record these atomic units. **Evidence:** Day 1 closing review consolidated in `docs/DAY_1_EVIDENCE.md`; daily evidence rows reconciled. Documentation-only change.
- [x] **Unit 2 — Inventory storage.** Owner approved explicit nightly records, a transactional booked counter, unavailable missing nights, and minimal fields/defaults/safeguards. **Evidence:** `src/db/schema.ts`, generated migration `0001_nightly_inventory.sql`, and 19 passing PostgreSQL integration tests; isolated branch verified, then development migrated. Rationale/alternatives in `docs/ARCHITECTURE.md`; details in `docs/DAY_2_EVIDENCE.md`. Booking transactions remain Unit 10 work.
- [x] **Unit 3 — Rate storage.** Owner approved "Standard stay", explicit positive integer-paise nightly prices, unavailable missing prices, an indicative-only catalogue guide, and minimal fields/safeguards. **Evidence:** rate-plan/nightly-rate schema, generated `0002_nightly_rates.sql`, 23 passing new rate database tests (42 total), development migrated after isolated verification, and passing desktop/mobile catalogue checks. Rationale in `docs/ARCHITECTURE.md`; results in `docs/DAY_2_EVIDENCE.md`. Actual seed data remains Unit 5; tax interpretation Unit 8; quote behavior Unit 9.
- [x] **Unit 4 — Booking records.** Owner approved the three-table layout, all booking storage choices, and database/service safeguard split. **Evidence:** `src/db/schema.ts`, generated `0003_booking_records.sql`, 36 passing booking-storage database tests (78 total), development migrated after isolated verification, and passing local checks/Webpack build. Decisions in `docs/ARCHITECTURE.md`; results in `docs/DAY_2_EVIDENCE.md`. No booking write API added. Occupancy/tax/confirmation/retry services remain Units 6/8/10/11.
- [ ] **Unit 5 — Synthetic seed data.** Decide booking horizon, demo allotments, and nightly prices. Verify repeatability and preservation of existing operational data; document seeded values.
- [ ] **Unit 6 — Stay and occupancy validation.** Decide timezone, valid booking dates, maximum stay, adult/child treatment, extra beds, and guest allocation. Test accepted/rejected dates, quantities, and occupancy.
- [ ] **Unit 7 — Availability.** Apply agreed rules across every stay night, excluding checkout. Verify missing inventory, blackouts, and insufficient stock.
- [ ] **Unit 8 — Tax and rounding.** Review official GST guidance and missing business facts; decide inclusive/exclusive presentation and rounding. Record configuration and worked examples; label provisional assumptions.
- [ ] **Unit 9 — Authoritative quotes.** Decide quote validity/identity and changed-price acceptance. Implement server-calculated nightly charges, quantities, taxes, and totals with deterministic tests.
- [ ] **Unit 10 — Atomic confirmation.** Discuss transaction boundaries, locking, simulated-payment timing, and whether holds are needed. Prove all-or-nothing mixed bookings and last-unit contention using independent database connections.
- [ ] **Unit 11 — Duplicate-submission protection.** Decide retry identity, simultaneous retries, and conflicting identifier reuse. Prove one booking/reservation for duplicate requests and rejection of conflicting reuse.
- [ ] **Unit 12 — Staff sign-in and sessions.** Confirm provisioning/session settings within Better Auth. Test seeded login, disabled public signup, server sessions, and logout; preserve the existing managed authentication schema.
- [ ] **Unit 13 — Staff authorization.** Review server boundaries and direct requests. Verify protected reads/mutations reject unauthorized access, including after logout.
- [ ] **Unit 14 — Nightly-rate editor.** Decide edit granularity and validation feedback. Build a protected editor using the approved design; verify saved changes affect quotes.
- [ ] **Unit 15 — Allotment editor.** Decide edit granularity and concurrent-booking conflicts. Verify allotment cannot fall below booked stock, including during competing writes.
- [ ] **Unit 16 — Blackout editor.** Decide edit granularity and conflict feedback. Verify new sales stop while existing bookings remain valid.
- [ ] **Unit 17 — Validate and close Day 2.** Run integrated acceptance checks, types, lint, formatting, unit/database tests, production build, and targeted desktop/mobile browser checks. Record deployment smoke test, commit, evidence, and unfinished scope.

**Testing rule:** each unit includes focused checks. Establish an isolated synthetic database-test setup before write-based integration tests. Catalogue/AI tests are not booking evidence. Final acceptance includes price-change acceptance, failed-payment inventory behavior, mixed rollback, concurrency, duplicate retries, authorization, and administration effects.

**Current status:** Units 1–4 complete (Units 1–2 committed as `4383b29`; Units 3–4 in the commit titled "Implement reviewed rate and booking storage"); Units 5–17 pending. Inventory, rate, and booking storage are implemented and tested; availability, quotes, and booking behavior are not implemented yet. Next action: Unit 5 seed-data discussion (booking horizon, demo allotments, nightly prices, and repeatability) before implementation. Unresolved business rules will be discussed before dependent implementation. Polished guest checkout and payment UI remain Day 3 work.

**Validation follow-up:** Unit 2 production build passed with Webpack; default Turbopack failed starting its CSS worker. Root cause remains open for investigation before claiming a passing default build at Day 2 close; see `docs/DAY_2_EVIDENCE.md`.

### Original Day 2 acceptance checklist

- [x] Implement room types, rate plans, nightly rates, inventory, bookings, and booking-item records. **Evidence:** Units 2–4, generated migrations through `0003_booking_records.sql`, 78 passing database checks, and development migrations applied. Storage only; booking services remain pending.
- [ ] Seed representative room/villa types with documented demo allotments and a bounded booking horizon.
- [ ] Implement date-range availability, quantity validation, occupancy limits, and authoritative price quotes.
- [ ] Define tax configuration and rounding; verify applicable official GST guidance before claiming tariff accuracy; label provisional demo assumptions.
- [ ] Implement transactional confirmation with retry protection.
- [ ] Implement demo login, session checks, logout, and protected staff operations.
- [ ] Implement a compact admin editor for daily rates, allotment, and blackout dates.
- [ ] Add business-rule and database concurrency tests.

**Done when:** competing requests for the last unit cannot both succeed; mixed bookings fail entirely when any item is unavailable; invalid dates, missing rates, excessive occupancy, and insufficient stock explain errors; unauthenticated requests cannot mutate staff data; admin changes affect availability and quotes.

## Day 3 — Wednesday, November 4: Complete guest booking journey

**Goal:** deliver the primary guest experience end to end.

- [ ] Build polished room browsing/detail views with optimized images and clear amenities.
- [ ] Implement dates, guest counts, and per-type quantities for mixed bookings.
- [ ] Keep checkout to three steps: selection → guest details/review → simulated payment/confirmation.
- [ ] Show nightly charges, taxes, quantities, and total before confirmation.
- [ ] Handle changed prices or availability by returning an updated review state requiring guest acceptance.
- [ ] Provide simulated success and failure controls without collecting real card details.
- [ ] Display a persisted confirmation using an unguessable reference; prevent sequential identifier exposure.
- [ ] Add mobile, keyboard, validation, loading, and empty-state behavior.

**Done when:** a guest can book two rooms and one villa together; refreshes and repeated submissions do not duplicate; failed payment leaves inventory unchanged; confirmed booking reduces availability on every booked night; deployed journey works on desktop and mobile.

## Day 4 — Thursday, November 5: Enquiry inbox and OpenRouter

**Goal:** demonstrate useful AI assistance while preserving staff control.

- [ ] Build a public enquiry form and persist submissions.
- [ ] Add staff-only simulated email and WhatsApp intake with visible source labels.
- [ ] Build inbox filters, enquiry detail, owner assignment, and editable drafts.
- [ ] Integrate OpenRouter classification, extraction, and reply drafting using validated structured output.
- [ ] Add manual-review handling for ambiguity, malformed responses, timeouts, and provider failures.
- [ ] Preserve uncertain dates rather than inventing missing years or details.
- [ ] Add GM-attention flags for complaints and one-action routing correction.
- [ ] Keep model-generated text separate from authoritative price insertion.
- [ ] Add request limits, input-size limits, and bounded AI execution.
- [ ] Evaluate the three supplied enquiries plus complaint, ambiguous, malformed, and adversarial examples.

**Done when:** each intake source appears in one inbox; clear examples receive useful categories, fields, assignments, and drafts; AI failure never loses an enquiry; corrections persist; no draft sends automatically; the API key never reaches browser code, logs, or Git.

## Day 5 — Friday, November 6: Integration and reviewer readiness

**Goal:** reach feature completion and make the demo easy to assess.

- [ ] Run full booking, administration, login, and enquiry journeys against the deployed app.
- [ ] Resolve integration defects and inconsistent validation.
- [ ] Review mobile layouts, keyboard navigation, labels, focus states, and error messages.
- [ ] Optimize large images and inspect behavior under a throttled mobile connection.
- [ ] Show demo credentials with a “Fill demo credentials” button; retain real sign-in submission.
- [ ] Add clear simulated-payment/channel labels and synthetic-data guidance.
- [ ] Provide an operator-only seed/reset command for restoring the shared demo.
- [ ] Prepare README setup instructions, architecture notes, limitations, and a short reviewer walkthrough.
- [ ] Freeze feature scope.

**Done when:** a reviewer can independently sign in, change rates, make a booking, and inspect AI routing; critical automated journeys pass; shared demo data is recoverable without a public reset; no blocking integration defects remain.

## Day 6 — Saturday, November 7: Release validation and handover

**Goal:** finish with a stable deployment and evidence that core requirements work.

- [ ] Run type checks, linting, unit tests, database integration tests, end-to-end tests, and a production build.
- [ ] Repeat concurrency, duplicate submission, failed payment, unauthorized access, and AI-outage scenarios.
- [ ] Verify clean setup and migration instructions.
- [ ] Review public repository contents and deployment configuration for accidental secrets or private material.
- [ ] Fix release-blocking defects; rerun affected checks.
- [ ] Smoke-test the final deployed version and inspect server errors.
- [ ] Record screenshots or a short walkthrough and link the deployment from the repository.
- [ ] Mark every acceptance criterion passed, deferred, or blocked with evidence.
- [ ] Tag the release and document remaining work for a production pilot.

**Done when:** all core acceptance checks pass against the final version; repository, live demo, setup guide, and reviewer walkthrough are available; no known overbooking, authorization, data-loss, or secret-exposure defects remain; remaining limitations are explicit.

## Daily evidence log

| Day   | Evidence                                                                                                                                                                                                                                | Status      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Day 1 | Exit criteria passed in the November 2 closing review; see [closing evidence](DAY_1_EVIDENCE.md#closing-review--november-2-2026).                                                                                                       | Complete    |
| Day 2 | Units 1–4 complete; Units 3–4 recorded in "Implement reviewed rate and booking storage". Storage migrations verified and applied to development; 78 database tests passed. See [Day 2 evidence](DAY_2_EVIDENCE.md). Units 5–17 pending. | In progress |
| Day 3 | —                                                                                                                                                                                                                                       | Pending     |
| Day 4 | —                                                                                                                                                                                                                                       | Pending     |
| Day 5 | —                                                                                                                                                                                                                                       | Pending     |
| Day 6 | —                                                                                                                                                                                                                                       | Pending     |

## Completion standard

Track planned work, completed checkboxes, evidence, blockers, and next actions each day. The demo uses shared synthetic data; reviewers may see one another's changes. Keep real guest data out of this deployment. Production readiness and business-outcome targets remain outside this six-day completion claim.
