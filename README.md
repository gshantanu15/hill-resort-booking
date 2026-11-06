# Hill Resort Booking

A six-day build of a reviewable resort direct-booking demo. It covers mixed room bookings, transactional inventory, staff administration, and an AI-assisted enquiry inbox.

## Current status

**November 6: Day 5 implementation and validation are ready for review on a feature branch; production approval is pending.** Days 1–4 are deployed. Earlier milestone notes below are historical. See [reviewer walkthrough and reset operations](docs/DAY_5_OPERATIONS.md) for the current Day 5 workflow.

Resort booking demo: https://hill-resort-booking.vercel.app . Neon development/demo branches are configured. GitHub is linked for deployments from main. The local staff inbox now uses owner-approved Haiku 5.5 assistance and has owner approval for Milestone 6; the Day 4 release is live. The owner-approved design system is saved in [DESIGN.md](DESIGN.md) and guides future screens. See [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) for the acceptance checklist, [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the public scope, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the locked decisions.

## Planned stack

Next.js, TypeScript, Tailwind, Neon PostgreSQL, Drizzle, Better Auth, OpenRouter, Vercel, Vitest, and Playwright.

## Local setup

Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`; never commit credentials. The original client brief is intentionally excluded from this public repository.

## Demo boundaries

Payments, email/WhatsApp, and reservation-system connections are simulated. The database contains synthetic data. The demo is not a production launch or a substitute for privacy, security, tax, payment, or operational review.

See [local setup and deployment](docs/SETUP.md) for exact commands and connection requirements. The catalogue, booking engine, staff calendar and Day 3 guest journey are implemented. Enquiry inbox and AI integration are implemented locally; see Day 4 status below.

Day 2 adds bounded nightly inventory/rates, server quotes, atomic mixed-booking confirmation/retries, and the staff calendar at `/staff/login`. See [booking rules and learning](docs/BOOKING_RULES.md). The synthetic shared login is `staff@aavana.example` / `EstateDemo!2026`; provision it with `npm run db:seed-staff` after migrations and the general seed. The guest journey is available at `/book`: mixed selection, itemized review, clearly labelled test payment and persisted confirmation. See [Day 3 evidence](docs/DAY_3_EVIDENCE.md).

The approved guest redesign is deployed: photographic galleries and amenities, availability-bounded quantities, derived guest totals, arrival/departure calendar, explicit room disclosures, tabular quote and payment switch, and copyable persisted confirmation. See [redesign release evidence](docs/GUEST_REDESIGN_EVIDENCE.md) for regression results and live smoke boundaries.

The November 4 follow-up polish is also deployed: improved imagery and validation, optional-phone checks, separate draft-policy acceptance receipts (migration 0007), and an explicitly unsent confirmation-email preview. Final release checks passed: 46 unit, 105 isolated database and 24 desktop/mobile browser tests. See [latest release evidence](docs/GUEST_POLISH_RELEASE.md). Day 4 production release is complete.

Day 4 local review: the date-picker fix (`b4a2b5e`) and public enquiry intake (`bf56f12`, migration 0008) are approved and committed. The protected staff inbox at `/staff/enquiries` now includes the owner-approved workbench redesign, filters, details and simulated email/WhatsApp intake. Milestone 3 is approved and complete. Milestone 4 manual routing, team overrides, editable unsent drafts and shared staff navigation are owner-approved and complete locally. Milestone 6 AI assistance is owner-approved and complete locally; migration 0009 is applied to development and isolated tests and the Day 4 production release is verified. See [Day 4 evidence](docs/DAY_4_EVIDENCE.md).

Day 4 model review: the owner selected Haiku 5.5 through OpenRouter with a $5 trial ceiling. Synthetic evaluation cost $0.0096023; the final prompt matched all 13 categories after correcting guest-count/date issues. [Review results and proposed controls](docs/AI_MODEL_DECISION.md). Milestone 5 configuration is owner-approved; Milestone 6 implements the approved controls and processing workflow locally.

Milestone 6 is owner-approved and complete locally. Staff can explicitly Analyse a saved enquiry, preserve manual routing/draft edits unless replacement is checked, and insert an authoritative accommodation quote from the read-only booking engine. AI drafts remain price-free; event enquiries retain a `[Sales-approved quote]` placeholder for manual Sales work. Migration 0009 is applied to development and the isolated test branch. Production release is complete; see docs/DAY_4_RELEASE.md.

The owner-approved reply refinement is integrated locally: email-style replies answer from verified amenity facts, default omitted years to the current resort calendar year, keep budget optional and avoid unnecessary age-split questions. Clear Reservations/Sales fill-ins stay before the signature. See [reply review](docs/AI_REPLY_REVIEW.md) and [integrated live result](docs/AI_REPLY_INTEGRATION_RESULTS.json). Existing saved staff drafts remain protected; analyse again to use the new policy.

Day 4 feature work and local validation are complete: 83 unit, 127 database and 46 browser checks pass, with integrated live-model evidence. Production release is complete after final approval; all 33 hosted synthetic checks pass. See [Day 4 release handoff](docs/DAY_4_RELEASE.md).

**Day 4 complete and deployed:** https://hill-resort-booking.vercel.app . Production migrations, bounded AI configuration and hosted smoke are verified. Existing bookings and inventory are unchanged. [Release evidence](docs/DAY_4_RELEASE.md).
