# Day 4 release and reviewer handoff

Status: **Day 4 complete.** Milestones 1–7 are approved and complete, including production migration, deployment and hosted synthetic smoke verification after the owner supplied final production approval.

## Reviewer workflow

1. Open `http://localhost:3000/staff/enquiries` and sign in with the seeded staff account.
2. Confirm the protected inbox shows website, simulated email and simulated WhatsApp enquiries, with source/category/owner/review filters and GM-attention state.
3. Open an enquiry and verify original whitespace-preserved content, staff-only contact details, extracted information and an explicitly unsent draft.
4. Correct category/owner, save, refresh and confirm persistence. Complaint and Unsorted must retain GM attention.
5. Edit Draft reply, save, refresh and confirm no send action exists.
6. Run Analyse explicitly on a synthetic enquiry. Verify loading/failure states, model/provider attribution, uncertainty preservation, price-free draft text and replacement protection for staff edits.
7. Add an accommodation quote only with exact dates and occupancy. Verify authoritative tax-inclusive pricing, 15-minute expiry and no inventory hold or booking. Events retain Sales handling and `[Sales-approved quote]`.
8. Exercise the pause control and verify analysis fails closed while inbox persistence, routing and draft editing remain available.

## Safety and product limits

- AI is staff-triggered only. No automatic processing or outbound message delivery exists.
- Haiku 5.5 runs through OpenRouter under the 100-request/$1 daily application cap, monotonic $5 ledger, conservative $0.05 reservation and provider key lifetime cap of $5.
- Omitted years use the owner-approved current Asia/Kolkata year with staff provenance; vague dates and unknown guest splits remain unfilled. Prices and commercial confirmations are never invented. Provider errors, malformed output, timeouts and disabled controls leave enquiries for manual review.
- Room quotes are read-only calculations with expiry; they do not hold stock or create bookings. Weddings/offsites do not receive invented venue/package prices.
- CLI pause and provider-console key disable are separate controls. Provider-accepted charges may not be cancellable or refundable.

## Data and migration boundary

- Migrations `0008_enquiry_intake` and `0009_enquiry_ai_controls` are applied to normal development and the isolated test branch.
- Migration 0009 verification preserved existing booking, inventory, rate, room, rate-plan and enquiry data; existing enquiries require explicit staff replacement before routing/draft overwrite.
- Production now includes migrations 0008/0009 and the verified Day 4 code. Hosted smoke uses synthetic enquiry writes only; no booking writes are permitted.
- Isolated branch `day4-ai-enquiry-tests` expires November 7, 2026 at 23:30 IST. Renew it before further write tests after expiry.

## Validation record

83 unit tests and 127 isolated database tests pass. Types, lint, formatting and production build pass. All 46 desktop/mobile production-mode browser cases pass. All six integrated live-model cases processed with correct categories, with one additional targeted repeat after fixing a model year-provenance note. The 127-case database and 46-case browser suites passed before this final narrowly scoped fix; affected AI database/browser cases were repeated afterward. Historical trial evidence remains separate from this final validation.

## Production approval gate

Automatic approval review rejected the production migration because the agreed workflow requires separate final local-release approval. No production migration, deployment or hosted write smoke was performed. Existing production data was read-only hashed for a future integrity comparison (9 bookings, 10 items, 17 booking nights, 540 inventory rows and 540 rate rows). Once release approval is supplied, apply migrations 0008/0009 before dependent code, configure the approved model and fail-closed inference gates, deploy, and smoke-test synthetic enquiries without booking writes. Do not mark the hosted release complete until those steps pass.

See [final live-model evaluation](AI_DAY4_FINAL_EVALUATION.json). The current-year provenance correction has an explicit regression test. No schema or UI layout changed during final validation.

## Completed production release

The owner supplied explicit final production approval after the earlier automatic-review rejection. Migrations 0008/0009 were applied before dependent code. Before/after hashes confirmed all nine existing bookings, ten items, seventeen booking nights, 540 inventory rows, 540 rates, three room types and one rate plan were unchanged. The known inference key was verified to have a $5 lifetime cap with no reset, then securely configured in Vercel without printing or downloading credentials. Haiku 5.5 and the environment gate are configured; the database gate was paused until verified and is now enabled.

Application commit `172b57b` is deployed at https://hill-resort-booking.vercel.app (deployment `dpl_FxX1XtiDCuFUuLYn1UYCb4VMhJsG`). GitHub validation succeeded. All 33 hosted checks passed: all three sources persisted and analysed, category/team routing and complaint GM attention were correct, public access and bad origins were blocked, pause failure retained the enquiry, authoritative room quote insertion and draft persistence worked, and desktop/mobile inbox layouts had no horizontal overflow. Synthetic enquiry fixtures were removed by their generated IDs; usage records remain. No booking or inventory writes occurred. See [hosted smoke evidence](DAY_4_HOSTED_SMOKE.json).

The historical pending-approval paragraph above is superseded by this completed release. Day 4 is complete; Day 5 work has not started.
