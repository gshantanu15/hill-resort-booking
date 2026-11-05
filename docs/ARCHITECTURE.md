# Architecture Decision Record

## Status

Approved baseline; implementation in progress.

## Day 3 guest journey

The owner approved illustrative amenities for the fictional accommodation, stored as presentation content keyed by room type. Capacities and prices continue to come from application data. No included meals, extra beds, or real-property claims are implied.

The guest checkout uses the existing availability, signed quote, and transactional confirmation services. Per-tab draft storage supports refresh recovery. A payment request must be saved before sending; an uncertain response retains the exact submission identifier and payload for retry. Guest edits remain blocked until that attempt resolves, avoiding a fresh submission after a possibly committed booking. Known declines remain recoverable. Refreshed quotes require renewed acceptance.

Payment remains explicitly simulated: one primary payment action and an expandable outcome selector, defaulting to success. Confirmation is a separate persisted, contact-free read through the random booking reference. There is no payment provider, new payment table, or guest account.

## Baseline decisions

The approved guest redesign retains the booking API and persistence boundary. Overall guest totals are derived from room-type allocations; older unsubmitted drafts are normalized before quoting, while pending payment requests remain byte-for-byte equivalent in meaning on retries. Availability limits quantity increases without exposing stock counts or silently reducing existing selections after date changes. The guest React Aria calendar's selected end is checkout directly, unlike the staff editor's inclusive stay-night picker. Payment outcome switching and visual confirmation do not introduce payment states or inventory holds. Confirmation continues to read persisted snapshots and never exposes contact data.

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

Owner approved the initial five-field design: required room type, calendar stay date, explicit integer allotment, integer booked count defaulting to zero, and explicit blackout boolean. Available stock is calculated, not stored. The room-type/date pair is the primary key; the room type must exist. Counts are nonnegative and booked cannot exceed allotment. Room-type deletion is restricted while inventory references it; fields cannot be null. Unit 5 extends this row with a validated website-ceiling copy to enforce the subsequently approved channel-stock policy.

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

## Seed-data decisions — November 3, 2026

Owner selected an explicit 180-night seed window starting November 3, 2026: stay nights November 3 through May 1, 2027 inclusive, with latest checkout May 2 subject to later stay validation. This is configured calendar coverage, not a maximum stay length. For the existing three room types and one plan, a complete empty-window seed creates 540 inventory rows and 540 nightly-rate rows, plus the approved "Standard stay" plan.

Rationale: the owner chose broader review coverage than the suggested 90 nights. An explicit start makes the same inputs target the same dates and permits deliberate extension. A rolling start could keep new seed dates current, but changes the target window over time and requires a resort-timezone decision; it was not selected.

Owner approved the existing catalogue figures as initial Sunday–Thursday configured nightly amounts, with Friday/Saturday stay nights 10% higher (replacing the unapproved 20% proposal). Estate: INR 8,500 / 9,350; Garden: INR 10,500 / 11,550; villa: INR 18,500 / 20,350. These become explicit nightly seed values, never runtime catalogue-price fallback. The varying prices demonstrate nightly pricing without implying market rates or selecting tax treatment.

Owner requires physical stock to match the local brief, rather than inventing property totals from small demo-allotment examples. The owner approved a category split and separate website/outside-channel allocations, with a 25% website share per type; client-specific quantities are retained in ignored `private/day2-business-decisions.md`. The category split and channel ratio are owner-selected demo assumptions, not a breakdown verified by the brief. Outside-channel stock is a protected allowance, not a live reservation-system integration or a count of outside bookings. Historical sales percentages are not an allocation formula.

Owner approved database-enforced channel limits: room types store physical units and website ceiling, with a positive physical count and `0 <= website ceiling <= physical units`. Outside reserve is their difference. Nightly inventory has a required ceiling copy; a composite foreign key requires it to match the room type, and row checks enforce `0 <= booked <= allotment <= ceiling`. Parent ceiling changes cascade to nightly copies, rejecting changes that would invalidate existing allotments. Normal staff operations edit nightly allotment/blackout only, not physical/channel ceilings. Guest capacity per unit remains distinct from number of units.

Rationale: a validated repeated ceiling lets PostgreSQL enforce each nightly bound directly, including writes outside the normal application path. Server-only checks use fewer schema fields but require every writer to remember the bound. Privileged operator changes remain distinct from ordinary staff editing; this is not live channel allocation management.

Owner selected no seeded blackouts. Newly inserted nights have `booked = 0` and `blackout = false`; existing values are preserved. The proposed November 20–21 villa blackout was not selected.

Owner approved fill-missing-only seeding in one transaction. Insert missing rooms/plan/calendar rows, preserve existing metadata/rates/allotments/blackouts/counters/bookings, and fail on a room-set or physical/channel-cap mismatch. Room types are locked while their configuration is validated. No pruning, reset, or automatic reallocation is performed. Reapplying defaults on every run would discard staff edits and was not selected; full operator reset remains Day 5 work.

Implemented in `src/db/demo-seed.ts`, `src/db/seed.ts`, the CLI seed, and tracked migration `0004_channel_stock_limits.sql`. The migration backfills the known types before requiring the new fields; unknown types or unsafe existing allotments fail rather than being guessed/clamped. Isolated verification preceded development migration/seeding. Shared demo unchanged. See `docs/DAY_2_EVIDENCE.md`. Tax interpretation remains Unit 8, and maximum stay/resort timezone remain Unit 6.

## Day 2 service decisions — November 3, 2026

The owner requested accelerated implementation: routine technical choices are made by the lead and documented; unresolved business rules still require owner input. [Booking rules](BOOKING_RULES.md) records the approved occupancy/date/tax policies, sources, worked example, and learning notes. It supersedes the earlier provisional Estate prices: INR 9,000/9,900 tax-inclusive is now approved. Migration `0006` updates only matching original Estate baseline values within the fixed window; other edited prices remain intact.

Read-only availability/quotes use repeatable-read transactions for internally consistent snapshots. Confirmation locks inventory in room-type/date order, then corresponding rate rows, and rechecks everything inside one transaction. Staff follows the same inventory-before-rate ordering. This gives explicit concurrency behavior rather than relying on an earlier availability response; database bounds remain the final safeguard. No distributed lock service or temporary holds are needed for the approved simulated-payment boundary.

Quotes use a purpose-separated HMAC token derived from the server auth secret, with a 15-minute expiry and a fingerprint of the complete priced selection. This prevents accepting caller-invented amounts without adding a persistent quote table or abandoned-checkout states. Changed/expired quotes return a fresh breakdown with HTTP 409 for renewed acceptance. Stock is never held by the quote.

Submission UUIDs acquire a transaction-scoped PostgreSQL advisory lock before checking the unique stored submission ID. Identical concurrent retries return the existing result; different normalized contact/selection/quote contents conflict. Uniqueness alone could reject a successful retry instead of returning its result. SHA-256 fingerprints preserve retry meaning; a separate public identifier adds no value to the chosen random UUID reference.

Better Auth uses separate `app_*` tables, preserving managed `neon_auth`. Provision the shared synthetic staff account through an operator script; no public signup. Sessions last eight hours with server lookup and no cookie session cache. Each staff page/API checks role, so login alone grants no staff privilege. Shared-demo profile/password mutation endpoints are disabled. HTTPS uses secure cookies; localhost HTTP is supported for isolated browser tests. Secrets never enter browser modules.

One compact calendar editor handles a maximum 31-night range with per-row atomic price/allotment/blackout saves. It reuses approved tokens and accessible controls. Explicit edits avoid accidental bulk changes; bulk editing, reset tooling, and audit history remain later scope. Allotment cannot undercut bookings or exceed the website cap, including concurrent writes. Blackouts preserve confirmed snapshots.

`npm run build` explicitly selects supported Webpack. Windows Turbopack's CSS worker failed to start in this environment; repeated attempts did not add useful evidence. The stable build keeps local/CI verification reproducible without changing application behavior or dependencies. This is a bundler workaround, not a claim that the Turbopack defect was repaired.

## Enquiry model and invariants

Every enquiry is persisted before AI processing and records its source. AI returns category, extracted fields, uncertainty, and a draft. Application rules assign owners and always flag complaints for GM attention. Malformed, timed-out, or low-confidence results remain visible for manual review. Staff can reroute and edit drafts; nothing is sent automatically. Any quoted price comes from the rate table, never from model text.

November 5 milestone 2 implements website persistence only. Submission IDs and normalized request fingerprints provide atomic idempotency; exact retries return the original random reference before checking intake limits. A shared transaction lock serializes durable per-hour limits (five per email, 100 total); local memory counters are not used. Only POST is public; responses exclude contacts and message contents. New rows begin unsorted/unprocessed for manual review. Inbox, simulated channels, routing controls and AI remain later review-gated milestones; model research is deferred until milestone 5.

Milestone 3 extends that service with staff-only simulated email/WhatsApp creation and protected list/detail reads. Source is part of simulated fingerprints without changing legacy website fingerprints. Lists select summaries and 160-character previews, bounded to 25 rows; detail selects only staff-visible contact/content fields, never retry internals. Page/count reads use a read-only repeatable-read transaction. The existing staff role is the only access boundary; no new accounts or team-specific permissions are introduced. The approved React Aria workbench uses real message previews in a scrollable queue, a reading pane with contact/original text, source SVGs and separate Assistant tab. Source/category/owner/review/GM-attention filters and pagination are reflected in the URL. Simulated intake runs in a bounded accessible dialog with exact-retry recovery. Milestone 4 makes routing and unsent drafts editable; extraction and AI analysis remain deferred.

## Demo boundaries

The deployment uses a shared synthetic dataset. Reviewers may see each other's demo changes. Fill-missing seeding is implemented; an operator-only full reset remains Day 5 work. This architecture is suitable for a demo and requires further security, privacy, operations, and external-system work before production use.

## OpenRouter setup decision — November 2, 2026

Owner selected google/gemma-4-26b-a4b-it:free. Owner-approved Dots free fallback resolves upstream shared-pool 429s while keeping Gemma primary. No paid fallback; 50/day and 20/min upstream quotas are the demo planning limits. JSON mode plus application-side validation is used because the live free endpoint rejects strict JSON Schema routing. Credentials stay server-only. See [OpenRouter configuration](OPENROUTER.md) for live verification status and failure handling.

## Approved booking polish integration — November 4, 2026

The owner approved the notification/contact/terms/email-preview mock, four supplied Gemini illustrations, and subsequent removal of image captions. The guest catalogue uses seven image choices across the three accommodation galleries with no shared image between room types. Thumbnail selectors retain accessible names; no selected-image text captions are shown. A single illustrative/AI imagery note and provenance remain available.

Booking feedback uses Sonner in the document flow so errors do not cover dates, price totals or actions. Validation explains missing dates and invalid guest/contact counts, with persistent field messages. Optional phone numbers are checked on client and server using libphonenumber-js numbering metadata; a format-valid number is not proof of ownership. Network and response-parser details are replaced by safe retry text.

Two initially unchecked acceptance choices offer the complete business-facing terms and separate data-use notice in centred, keyboard-accessible dialogs. The notices retain their approved non-binding draft status and unresolved operator/contact/policy details; integrating these documents does not activate real commercial policies. The full approved wording is versioned in src/lib/booking-policies.ts and docs/BOOKING_POLICIES_DRAFT.md.

New booking writes require current document acceptance and record versions plus a server timestamp in the same inventory transaction. Migration 0007 adds nullable receipt columns so older booking rows remain readable. Exact committed retries are looked up before imposing newer policy/phone rules; pending client requests are replayed unchanged. Public confirmation still excludes contact details, acceptance receipts and retry fingerprints.

Confirmation uses the approved saved-demo framing and email-sent example beside an explicitly unsent preview. The preview uses only persisted public stay/price information and does not fetch the contact email. There is no download control, outbound email integration or real charging.

## Milestone 6 AI and staff quoting — owner-approved locally

Staff-triggered Analyse uses Haiku 5.5 through OpenRouter with the approved controls: 100 requests/$1 daily application allowance, a monotonic $5 trial ledger and conservative $0.05 reservation per call, plus the provider key's $5 lifetime cap. The CLI pause/stop control and provider-console key disable are separate off-switches. Missing or disabled controls fail closed; no automatic retry is used.

AI output is validated, uncertainty is preserved, and drafts remain price-free. Staff routing and draft edits are protected by explicit replacement choices. Event enquiries receive a `[Sales-approved quote]` placeholder. Room quotes use the read-only booking quote engine, retain authoritative tax/price breakdowns, expire after 15 minutes and create no holds or bookings. Migration 0009 is verified on the isolated test branch and applied to normal development. Milestone 6 is owner-approved locally; production is untouched.

The owner-approved reply refinement uses prompt v4 with current database room names/capacities and approved catalogue amenity facts. Omitted years use the current Asia/Kolkata calendar year with recorded provenance, overriding the original no-year-inference policy; vague dates remain raw and past dates require staff attention. Budget and age splits do not block an informative first reply. A pure formatter preserves email structure and keeps a single event quote slot before the closing. Checked accommodation insertion replaces the labelled Reservations slot or inserts before the closing. Existing booking occupancy/date validation and staff-edit revision protection remain intact.

## Manual enquiry routing and drafts — milestone 4

PATCH /api/staff/enquiries/[id] checks staff authentication, matching Origin and bounded JSON before applying a strict route or draft action. Route changes default Room to Reservations, Wedding/Offsite to Sales, Complaint/Unsorted to GM; explicit owner overrides are permitted. An owner-only save preserves its category. Complaint/Unsorted always have needs-review and GM-attention flags, including after owner overrides. Resolving to Room/Wedding/Offsite clears those flags; this does not mark AI processing complete. Draft updates change only draft text, preserve whitespace and accept an empty draft to clear it. There is no send endpoint or action.

Transactions lock the enquiry row with bounded waits. Clients provide the saved category/owner or draft baseline; a changed baseline returns 409 unless the requested values are already saved, allowing safe retries after lost responses. Routing and drafts have independent baselines and update separate columns. This compares field values, not a revision history; identical intervening changes are indistinguishable. Original guest content remains immutable. The shared JSON reader retains its 16 KiB default; this staff PATCH alone allows 64 KiB for two bounded 6,000-character draft strings including Unicode. No migration or provider call is required.

The approved workbench adds compact routing selectors and a labelled unsent draft editor. Save errors retain local edits; conflict reloads require explicit discard confirmation. Tab changes retain draft state, navigation warns about unsaved changes, and refresh/close uses the browser unsaved warning. Unsaved text is held in memory, so a closed/crashed tab cannot recover changes that were never saved. Filters/counts are refreshed from the server on the next inbox refresh or filter change; the currently edited record remains visible while routing is saved.
