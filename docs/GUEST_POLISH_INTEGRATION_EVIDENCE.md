# Guest polish integration and regression evidence — November 4, 2026

## Delivered

Approved catalogue images, caption removal, in-flow Sonner feedback, safe date/occupancy/contact errors, shared optional-phone validation, complete non-binding terms/data-use documents, separate acceptance choices, and an explicitly unsent email preview are integrated into the application. No .txt download exists. Existing dates, server pricing, lost-stock handling, staff authorization/calendar behavior, idempotency and contact-free public confirmation remain in place.

New dependencies: Sonner and libphonenumber-js. Native dialogs/labelled checkboxes follow the approved UIAble-inspired mock; no paid template or duplicate component framework was added.

## Data and compatibility

Migration: drizzle/0007_booking_policy_receipt.sql. Three nullable columns store terms_version, data_use_version and policy_accepted_at. Current acceptance is required server-side for new reservations; accepted versions are in the idempotency fingerprint. Server acceptance timestamp and inventory updates commit together. Existing committed legacy requests with no acceptance fields still resolve before newer validation, without another stock deduction. The legacy fixture explicitly verifies this.

Migration and all booking/staff writes were run only against verified isolated branch day3-guest-redesign-tests (br-gentle-hall-ao24q2kb), endpoint ep-silent-recipe-aoebqnm6. Neon metadata confirmed the association and non-primary status; connection guards compare normalized hosts against .env.local and .env.demo.local. Existing synthetic fixtures restore only their owned rows or original inventory/rates. No production migration, booking writes, reseed, deployment or Git commit was performed.

## Checks

- 46 unit tests passed, including added phone and safe-error boundaries.
- 105 PostgreSQL regressions passed, including concurrency, failed-payment no-write behavior, stale/missing acceptance, persisted receipts, exact legacy retry, price expiry, tax and contact-free confirmation.
- 24 complete desktop/mobile browser regressions passed against a production build, retaining staff role/access/calendar/failure tests.
- Six affected guest journeys passed after the confirmation copy/style cleanup; four additional targeted desktop/mobile checks verified unique gallery choices, no visible captions, empty-phone recovery, dialog reading/Escape/Tab wrap and reachable close/return controls.
- TypeScript, ESLint, repository formatting and production build passed. Final dialog-centering/error-message refinements also passed the final production build, TypeScript, ESLint and formatting checks.
- Browser screenshot review covered desktop/mobile selection, payment, confirmation, validation and policy dialogs. An independent source/screenshot review found no remaining concrete correctness defects; owner-approved example email wording is retained with its adjacent no-send disclosure.
- Configured-secret scan across 63 changed/nonignored new paths found no configured credential values. Local credentials and test harness output stay ignored.
- npm audit --omit=dev reports four moderate advisories via existing Drizzle/esbuild tooling dependencies; no high/critical findings and neither new package affected. No forced dependency update was applied. The full install audit includes development-tool advisories as well; do not conflate its larger count with the production-tree report.
- Rendered Hallmark audit found no Floor failures. Two design Reflex findings were assessed: the already approved composite date-picker height (waiver in stay-date-picker.css), and a mobile attribution-name wrap, corrected with nowrap on credit links. Final render check is recorded below.

Screenshots and local reports: ignored output/polish-integration/ and test-results/. Full policy draft: docs/BOOKING_POLICIES_DRAFT.md. Image provenance: public/images/design/CREDITS.md.

## Review and rollout boundary

Review the integrated application at http://localhost:3000/, served with the verified isolated database. Restart helper: node output/polish-integration/serve.mjs. Its connection guard refuses development/shared-demo endpoints. The isolated branch expires November 5, 2026 at 17:30 IST; this local review data is temporary.

Production remains on the previous release. A later production rollout must apply additive migration 0007 before promoting this build, then run read-only browsing/quotes/staff-denial smoke checks. Do not exercise production booking writes for release smoke. Rollback to the previous build can leave nullable receipt columns in place; no data rollback is needed. Keep non-binding notices until the operator and commercial/privacy details are completed and separately approved for real use. Previewed email wording never establishes delivery.

## Final check after screenshot fixes

The final production build passed. All six affected guest regressions passed again on desktop/mobile after dialog centering and safe parser/network-message handling, including actual persisted mixed bookings and exact retry. The policy test asserts the dialog has positive horizontal/vertical margins, scrolling keeps Return to review reachable, Tab wraps to Close policy, and Escape restores the read-link focus. The gallery test asserts all seven choices are unique and visible captions are absent.

Final rendered audit: 0 Floor failures, one existing approved composite-picker height waiver (39b), and one assessed Finish warning (F3) on the calendar month/year heading. F3 is dismissed for this short calendar control rather than changing its approved typography. The prior attribution-wrap Reflex is resolved. Ten rendered page captures were generated. Independent code/screenshot review found no further concrete defects; final error/dialog screenshots were also visually inspected by the lead.

Final screenshot paths: output/polish-integration/recheck-results/ includes confirmation, payment, selection, missing-date warning, phone field feedback, native policy dialog and catalogue for desktop/mobile. The source remains uncommitted for manual review; prior unrelated working-tree edits were preserved.

## Released to development and production

The follow-up rollout is complete. Migration 0007 was applied to both normal database environments and deployment dpl_8orH3Ntq1fQsCuCQGgZTkKCD3Y8T was staged, checked and promoted to https://hill-resort-booking.vercel.app/. Development at http://localhost:3000/ now uses its normal development branch, not temporary regression data. See [GUEST_POLISH_RELEASE.md](GUEST_POLISH_RELEASE.md) for post-release smoke evidence, unchanged data snapshots and rollback. Earlier sections describe the pre-release review boundary and are retained as the validation record.
