# Architecture Decision Record

## Status

Approved baseline; implementation in progress.

## Decisions

- Next.js and TypeScript provide one full-stack application with server-side business logic.
- Tailwind provides the visual system for the restrained coffee-estate design.
- Neon PostgreSQL stores durable data; Drizzle owns schema and migrations.
- Vercel hosts the deployable demo and connects to the public GitHub repository.
- Better Auth provides email/password authentication. Public registration is disabled; a seeded shared demo staff account is shown on the login screen. Passwords are hashed and sessions are checked server-side.
- OpenRouter is the AI provider. The API key stays server-side and the model is configurable through `OPENROUTER_MODEL`.
- Vitest covers business rules, database integration covers inventory, and Playwright covers critical browser journeys.

## Booking model and invariants

A booking has one contact, shared check-in/check-out dates, guest counts, and one or more room-type quantity items. Checkout day does not consume stock. Money is integer paise. Quotes, taxes, and confirmation prices are computed server-side.

Confirmation rechecks price and availability and reserves every requested room type and night in one transaction. A unique submission identifier prevents duplicate retries. Inventory records are locked in stable order. If any item is unavailable, the whole booking fails. Blackouts stop new sales; they do not invalidate existing bookings. Staff cannot reduce allotment below already-booked inventory.

## Enquiry model and invariants

Every enquiry is persisted before AI processing and records its source. AI returns category, extracted fields, uncertainty, and a draft. Application rules assign owners and always flag complaints for GM attention. Malformed, timed-out, or low-confidence results remain visible for manual review. Staff can reroute and edit drafts; nothing is sent automatically. Any quoted price comes from the rate table, never from model text.

## Demo boundaries

The deployment uses a shared synthetic dataset. Reviewers may see each other's demo changes. An operator-only seed/reset path restores it. This architecture is suitable for a demo and requires further security, privacy, operations, and external-system work before production use.

## OpenRouter setup decision — November 2, 2026

Owner selected google/gemma-4-26b-a4b-it:free. No paid fallback; 50/day and 20/min upstream quotas are the demo planning limits. JSON mode plus application-side validation is used because the live free endpoint rejects strict JSON Schema routing. Credentials stay server-only. See [OpenRouter configuration](OPENROUTER.md) for live verification status and failure handling.
