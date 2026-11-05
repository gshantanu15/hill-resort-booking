# Hill Resort Booking

A six-day build of a reviewable resort direct-booking demo. It covers mixed room bookings, transactional inventory, staff administration, and an AI-assisted enquiry inbox.

## Current status

Resort booking demo: https://hill-resort-booking.vercel.app . Neon development/demo branches are configured. GitHub is linked for deployments from main. OpenRouter is verified with Gemma as primary and an owner-approved free Dots fallback. All four live sample classifications passed. The owner-approved design system is saved in [DESIGN.md](DESIGN.md) and guides future screens. See [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) for the acceptance checklist, [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the public scope, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the locked decisions.

## Planned stack

Next.js, TypeScript, Tailwind, Neon PostgreSQL, Drizzle, Better Auth, OpenRouter, Vercel, Vitest, and Playwright.

## Local setup

Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`; never commit credentials. The original client brief is intentionally excluded from this public repository.

## Demo boundaries

Payments, email/WhatsApp, and reservation-system connections are simulated. The database contains synthetic data. The demo is not a production launch or a substitute for privacy, security, tax, payment, or operational review.

See [local setup and deployment](docs/SETUP.md) for exact commands and connection requirements. The catalogue, booking engine, staff calendar and Day 3 guest journey are implemented. Enquiry inbox and AI integration remain scheduled work.

Day 2 adds bounded nightly inventory/rates, server quotes, atomic mixed-booking confirmation/retries, and the staff calendar at `/staff/login`. See [booking rules and learning](docs/BOOKING_RULES.md). The synthetic shared login is `staff@aavana.example` / `EstateDemo!2026`; provision it with `npm run db:seed-staff` after migrations and the general seed. The guest journey is available at `/book`: mixed selection, itemized review, clearly labelled test payment and persisted confirmation. See [Day 3 evidence](docs/DAY_3_EVIDENCE.md).

The approved guest redesign is deployed: photographic galleries and amenities, availability-bounded quantities, derived guest totals, arrival/departure calendar, explicit room disclosures, tabular quote and payment switch, and copyable persisted confirmation. See [redesign release evidence](docs/GUEST_REDESIGN_EVIDENCE.md) for regression results and live smoke boundaries.

The November 4 follow-up polish is also deployed: improved imagery and validation, optional-phone checks, separate draft-policy acceptance receipts (migration 0007), and an explicitly unsent confirmation-email preview. Final release checks passed: 46 unit, 105 isolated database and 24 desktop/mobile browser tests. See [latest release evidence](docs/GUEST_POLISH_RELEASE.md). Day 4 enquiry inbox and AI integration remain pending.

Day 4 local review: the date-picker fix (`b4a2b5e`) and public enquiry intake (`bf56f12`, migration 0008) are approved and committed. The protected staff inbox at `/staff/enquiries` now includes the owner-approved workbench redesign, filters, details and simulated email/WhatsApp intake. Milestone 3 is approved and complete. Milestone 4 manual routing, team overrides, editable unsent drafts and shared staff navigation are owner-approved and complete locally. AI remains pending; Day 4 changes are not deployed. See [Day 4 evidence](docs/DAY_4_EVIDENCE.md).

Day 4 model review: the owner selected Haiku 5.5 through OpenRouter with a $5 trial ceiling. Synthetic evaluation cost $0.0096023; the final prompt matched all 13 categories after correcting guest-count/date issues. [Review results and proposed controls](docs/AI_MODEL_DECISION.md). Milestone 5 configuration is owner-approved; application AI remains disabled until milestone 6 implements the controls and processing workflow.
