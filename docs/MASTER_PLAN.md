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
- [ ] Agree a compact visual direction: fictional coffee-estate identity, restrained palette, typography, licensed photography, and mobile layout.
- [x] Build the application shell and demonstrate a database-backed room listing. **Evidence:** live public catalogue and passing desktop/mobile checks.

**Done when:** a fresh checkout has documented setup, CI passes, a deployed URL renders seeded rooms, and no credentials, original brief, or private client material is public.

## Day 2 — Tuesday, November 3: Inventory, pricing, and staff access

**Goal:** build and test the rules that make displayed availability trustworthy.

- [ ] Implement room types, rate plans, nightly rates, inventory, bookings, and booking-item records.
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

| Day   | Evidence                                                                                                                                   | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Day 1 | `private/` ignored; docs created; local Git repository initialized. Public repository: https://github.com/gshantanu15/hill-resort-booking. | In progress |
| Day 2 | —                                                                                                                                          | Pending     |
| Day 3 | —                                                                                                                                          | Pending     |
| Day 4 | —                                                                                                                                          | Pending     |
| Day 5 | —                                                                                                                                          | Pending     |
| Day 6 | —                                                                                                                                          | Pending     |

## Completion standard

Track planned work, completed checkboxes, evidence, blockers, and next actions each day. The demo uses shared synthetic data; reviewers may see one another's changes. Keep real guest data out of this deployment. Production readiness and business-outcome targets remain outside this six-day completion claim.
