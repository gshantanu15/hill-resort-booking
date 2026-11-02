# Hill Resort Booking

A six-day build of a reviewable resort direct-booking demo. It covers mixed room bookings, transactional inventory, staff administration, and an AI-assisted enquiry inbox.

## Current status

Day 1 foundation is in progress. See [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) for the acceptance checklist, [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the public scope, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the locked decisions.

## Planned stack

Next.js, TypeScript, Tailwind, Neon PostgreSQL, Drizzle, Better Auth, OpenRouter, Vercel, Vitest, and Playwright.

## Local setup

The application scaffold and database commands are being added during Day 1. Copy `.env.example` to `.env.local` when it exists; never commit credentials. The original client brief is intentionally excluded from this public repository.

## Demo boundaries

Payments, email/WhatsApp, and reservation-system connections are simulated. The database contains synthetic data. The demo is not a production launch or a substitute for privacy, security, tax, payment, or operational review.

See [local setup and deployment](docs/SETUP.md) for exact commands and connection requirements. The day-one catalogue is implemented; booking, authentication, and AI features remain scheduled work.
