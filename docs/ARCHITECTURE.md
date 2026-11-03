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

## Booking storage decisions — November 3, 2026

Owner approved confirmed bookings only. After simulated payment success, the final confirmation transaction rechecks prices/stock, creates the booking and items, and reserves all requested inventory together. Only successful completion produces a confirmation. Failed simulated payment or failed final confirmation creates no durable booking and consumes no stock. Simulated success is not itself booking confirmation.

Earlier checkout selections remain temporary. No pending/failed booking records, stock holds, or abandoned-checkout history are included. This lifecycle choice is made in Unit 4 because it affects storage; implementation of the transaction remains Unit 10 and duplicate retry handling Unit 11.

Rationale: confirmed-only records cover the demo outcome without extra states, transitions, or cleanup rules. Persisting checkout attempts could support history/resumption and need not reserve stock, but adds lifecycle and retention behavior not required by the selected scope. Unfinished checkout has no server-side history under the approved choice.

Owner approved one booking contact with required full name and email, and optional phone. This does not introduce verified email/phone, real messaging, or individual guest profiles. Rationale: identify the booking contact without requiring a number that the simulated flow does not use. Requiring phone as well is viable for staff operations that depend on it, but was not selected.

Owner approved separate adult and child counts for the booking, with total guests calculated from those counts. Rationale: preserve the distinction for later occupancy rules; one total would discard it. Age boundaries, minimum-adult rules, extra beds, and allocation across room types are not implied by this approval and must be discussed before dependent implementation.

Owner approved adult/child allocation per room-type group alongside overall booking counts. A group represents a quantity of one room type (for example, two Estate rooms), not physical room assignments. Allocations must sum to the overall counts. Rationale: support group-specific occupancy validation and make the intended distribution explicit. Overall counts alone reduce checkout inputs but leave that distribution unspecified. This adds input and cross-record consistency checks; exact occupancy policies remain Unit 6 and enforcement in booking writes remains later transaction work.

Owner approved structured nightly price/tax snapshot rows linked to booking items, preserving accepted values rather than recalculating historical confirmations from live rates. Rationale: SQL inspection and database constraints are straightforward, at the cost of another table. Validated JSON is viable with fewer tables but more application-side structural validation. Final snapshot fields and tax rules are not selected by this storage choice.

Owner approved a server-generated random UUID as both booking database ID and unguessable confirmation reference, with a separate unique submission ID and server-computed request fingerprint for later retry checks. Rationale: no sequential identifier is exposed, without adding a separate public-reference field. An independent random public reference could support separate formatting/rotation, but adds an identifier without a current requirement. Fingerprint calculation and retry handling remain Unit 11 work.

Owner approved snapshot content: booked room-type/plan names; each group's nightly configured unit price; group-night accommodation subtotal excluding tax, tax amount, and total; applied tax rate in basis points; and whether the configured unit price included tax. Monetary values are integer paise. This preserves accepted labels/amounts after live edits without choosing inclusive/exclusive policy or actual tax rates now; those remain Unit 8 decisions.

Owner approved the final three-table layout: `bookings` holds the random UUID/reference, unique submission UUID, SHA-256 fingerprint, contact, shared dates, overall adult/child counts, plan ID/name snapshot, and creation timestamp. `booking_items` has one room-type group per booking with its name snapshot, quantity, and adult/child allocation. `booking_nights` has one row per group/date containing the approved monetary/tax snapshots. Booking money totals are derived from saved nightly rows, not duplicated on the header or read from live prices. No status column or live nightly-price foreign key is included.

Approved database safeguards: required/nonblank values, valid date order, nonnegative counts with at least one guest overall, positive quantities/unit prices/totals, nonnegative subtotal/tax/rate, nightly total equal to subtotal plus tax, unique keys, and valid/restricted references. The request fingerprint's stored form is 64 lowercase hexadecimal characters; its calculation and comparison are Unit 11 work. Amount fields use the existing PostgreSQL integer-paise representation and reject out-of-range input.

Cross-record completeness (at least one item and all stay nights), allocation sums, date coverage, capacity/age rules, tax arithmetic/rounding, and agreement with inventory are service/transaction checks before exposing booking writes. These are not claimed as schema guarantees. Exact email/phone validation also belongs at the later application input boundary; nonblank storage is not contact verification. Minimum-adult policy remains undecided in Unit 6.

Implemented in `src/db/schema.ts` and generated migration `0003_booking_records.sql`. Verified on the isolated test branch, then applied to development; shared demo unchanged. Tests cover local constraints and snapshot independence from live edits, not the later confirmation service. See `docs/DAY_2_EVIDENCE.md`. Cancellation/refund flows remain outside the demo.

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

## Rate storage decisions — November 3, 2026

Owner approved one named demo rate plan, "Standard stay", shared across room types, with separate prices per room type/night. This does not imply identical prices across room types or dates. No package benefits, meal inclusions, or cancellation terms have been selected by this decision.

Rationale: one offer demonstrates rate-plan storage, date-specific pricing, and administration without introducing undefined package rules or an additional guest choice. Multiple selectable plans are viable when comparing distinct offers is required, but their benefits and pricing rules would need defining first. They are outside the current approved rate-plan scope.

Owner approved explicit nightly prices: each room type/stay date/rate plan has its own configured price, rather than inheriting a default with date overrides. Repeated prices can be populated through seed or later bulk editing; this does not require manual entry for every night.

Rationale: each configured night has one inspectable price for staff edits and authoritative quotes, without inheritance or override precedence. Defaults with overrides reduce repeated records and suit long calendars, but add default-change semantics that are unnecessary for the bounded demo.

Owner approved missing-price behavior: if any requested stay night lacks a configured price for the selected room type/plan, show "Price unavailable for these dates" and do not offer a quote or booking for that affected stay until fully priced. Do not invent a total, present a partial sum as the full stay total, or substitute the catalogue price. Other fully priced room types may still be offered; final mixed-booking confirmation remains all-or-nothing.

Rationale: missing pricing is distinct from sold-out inventory, and a bookable quote needs authoritative prices for every night. A labelled non-bookable estimate could support early planning, but needs an additional estimation rule and UI states; the owner selected no estimate.

Owner approved retaining the existing catalogue price as an explicitly labelled indicative guide only. It is never used in authoritative quotes or as fallback for missing nightly prices. The current undated display must make that distinction clear and direct guests to select dates for an exact quote. Nightly edits do not automatically update the guide, so it can become stale.

Rationale: this preserves a simple browsing comparison without adding minimum-sellable-rate queries and date-range/freshness rules. Deriving a "from" price could reflect configured stock/rates but needs those rules; hiding prices until dates are selected avoids undated ambiguity but reduces browsing information. The owner selected the labelled guide.

Owner approved strictly positive nightly prices; zero/negative prices are invalid. Complimentary nights are outside the selected paid-booking scope. Rate plans have nonblank IDs/names. Nightly rates have required room-type/plan references, a calendar date, and an explicit integer-paise amount per accommodation unit/night. The room-type/plan/date triple is the primary key; referenced room types/plans cannot be deleted. There is no default amount or stored stay total. Pricing is configured independently of inventory; later booking requires both.

Rationale: the minimal fields represent the selected offer and nightly prices without package rules or additional counters. Keeping rates separate from inventory allows independent configuration. Required values, positive amounts, unique keys, and restricted deletion protect stored data; a stored total would become stale when its inputs changed.

Implemented in `src/db/schema.ts` and generated migration `0002_nightly_rates.sql`; verified on the isolated test branch before development migration. The catalogue now explicitly labels its guide price. "Standard stay" and actual nightly prices will be seeded in Unit 5, not by this schema migration. Tax configuration and inclusive/exclusive interpretation remain Unit 8 decisions; this unit approves no tax assumption. Missing-price quote/booking rejection remains later service work, not behavior proved by these tables alone. See `docs/DAY_2_EVIDENCE.md`.

## Enquiry model and invariants

Every enquiry is persisted before AI processing and records its source. AI returns category, extracted fields, uncertainty, and a draft. Application rules assign owners and always flag complaints for GM attention. Malformed, timed-out, or low-confidence results remain visible for manual review. Staff can reroute and edit drafts; nothing is sent automatically. Any quoted price comes from the rate table, never from model text.

## Demo boundaries

The deployment uses a shared synthetic dataset. Reviewers may see each other's demo changes. An operator-only seed/reset path restores it. This architecture is suitable for a demo and requires further security, privacy, operations, and external-system work before production use.

## OpenRouter setup decision — November 2, 2026

Owner selected google/gemma-4-26b-a4b-it:free. Owner-approved Dots free fallback resolves upstream shared-pool 429s while keeping Gemma primary. No paid fallback; 50/day and 20/min upstream quotas are the demo planning limits. JSON mode plus application-side validation is used because the live free endpoint rejects strict JSON Schema routing. Credentials stay server-only. See [OpenRouter configuration](OPENROUTER.md) for live verification status and failure handling.
