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

## Inventory storage decision — November 3, 2026

Owner approved explicit nightly records: one record per room type and stay date, holding that night's website allotment and blackout state. This is the website's sellable allocation, not the property's total physical room count.

Rationale: date-specific staff changes and later transaction locks have a concrete record per night, making behavior straightforward to inspect and test within a bounded booking horizon. Records must be generated and the horizon extended when needed; exact horizon/allotments remain Unit 5 decisions.

Alternative considered: a default allotment with date exceptions saves repetitive records but adds override precedence and default-change behavior, plus additional concurrency coordination. It remains viable; explicit nightly records fit this demo's bounded scope better.

Owner also approved a stored booked counter on each nightly record. Booking records and all affected nightly counters must be written in the same database transaction: both succeed or both roll back. The counter is maintained by booking operations, not an independent staff-editable value. The agreed rule prohibiting allotment below booked stock remains in force.

Rationale: direct availability arithmetic and database bounds are straightforward. Alternative considered: calculate quantities from inventory-consuming booking records. That avoids a duplicate count, but requires aggregation and concurrency coordination. A counter introduces a consistency obligation: bounds alone cannot prove agreement with booking records, so later integration tests must check both. Neither approach alone prevents overbooking; transaction locking and duplicate-submission protection remain Units 10–11.

Owner approved missing-record behavior: a room type is unavailable for a requested stay if any stay night lacks an inventory record. Missing setup is not treated as known sold-out stock; sales remain closed until configured. Guest availability/confirmation must not create missing nights from defaults. Fully configured alternative room types may still be offered; an attempted mixed booking containing an unavailable item fails entirely.

Rationale: unknown authorized stock must not silently open sales. Automatic creation from defaults could reduce calendar maintenance but would require an approved default stock source and date-opening rules that this demo has not selected.

Owner approved the minimal five-field design: required room type, calendar stay date, explicit integer allotment, integer booked count defaulting to zero, and explicit blackout boolean. Available stock is calculated, not stored. The room-type/date pair is the primary key; the room type must exist. Counts are nonnegative and booked cannot exceed allotment. Room-type deletion is restricted while inventory references it; fields cannot be null.

Rationale: these constraints enforce local inventory validity at the database boundary. A separate inventory ID and stored available count add no required capability. Cascading room-type deletion could erase operational inventory unintentionally. Calendar-date storage avoids introducing a time-of-day into a stay night; resort timezone rules remain Unit 6 work.

Implemented in `src/db/schema.ts` and generated Drizzle migration `0001_nightly_inventory.sql`. Verified on an isolated development-child branch, then applied to development; demo is unchanged. See `docs/DAY_2_EVIDENCE.md`. Availability behavior, transactional counter maintenance, and concurrency guarantees remain later units, not properties proved by this schema alone.

## Enquiry model and invariants

Every enquiry is persisted before AI processing and records its source. AI returns category, extracted fields, uncertainty, and a draft. Application rules assign owners and always flag complaints for GM attention. Malformed, timed-out, or low-confidence results remain visible for manual review. Staff can reroute and edit drafts; nothing is sent automatically. Any quoted price comes from the rate table, never from model text.

## Demo boundaries

The deployment uses a shared synthetic dataset. Reviewers may see each other's demo changes. An operator-only seed/reset path restores it. This architecture is suitable for a demo and requires further security, privacy, operations, and external-system work before production use.

## OpenRouter setup decision — November 2, 2026

Owner selected google/gemma-4-26b-a4b-it:free. Owner-approved Dots free fallback resolves upstream shared-pool 429s while keeping Gemma primary. No paid fallback; 50/day and 20/min upstream quotas are the demo planning limits. JSON mode plus application-side validation is used because the live free endpoint rejects strict JSON Schema routing. Credentials stay server-only. See [OpenRouter configuration](OPENROUTER.md) for live verification status and failure handling.
