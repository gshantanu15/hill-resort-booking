# Approved guest redesign integration — November 4, 2026

## Delivered behavior

The owner approved three rounds of interactive mocks before integration. The production application now uses photographic room rows, selectable galleries, semantic amenity icons, a visible booking stepper, compact quantity controls, a guest date calendar, and click-only room disclosures. Overall adults/children are derived from room-type allocations. Exact stock counts are not displayed; controls honor the availability limit and explain selections that no longer fit changed dates.

Guest date selection uses the chosen end as the exclusive checkout date. The staff editor retains its inclusive stay-night model. Required contact details, signed quotes, fresh-price acceptance, failed-payment behavior, pending request storage, unchanged retries and transactional confirmation remain in place. The outcome control is an accessible switch with reduced-motion support. Nightly charges use a semantic table and authoritative paise totals.

Persisted confirmation has a deliberate success heading/seal, weekday and date shown once, accommodation/tax detail, the full random reference, clipboard copying and a manual selection fallback. The review step uses a document icon, not a success tick. Existing noindex/no-referrer and contact-free confirmation contracts are preserved.

No database schema, rate policy, authentication contract, payment provider or dependency change was needed. Photographs and amenities remain openly illustrative; genuine room-specific photo sets are still the principal material gap.

## Verification

- **42 unit tests passed**, including derived guest totals, invalid-allocation preservation, quantity limits and guest-label formatting.
- **102 PostgreSQL integration tests passed** on isolated branch `br-gentle-hall-ao24q2kb` (`day3-guest-redesign-tests`), cloned from synthetic development data. Expiry: November 5, 2026 at 17:30 IST.
- **22 desktop/mobile browser regressions passed** against a production build. Existing staff access, role, calendar, failure, draft and focus assertions are retained.
- The guest journey verifies mixed two-room/one-villa selection, derived totals, declined payment with unchanged counters, changed quote acceptance, refresh preservation, double-click protection, a lost committed response followed by exact retry, one persisted booking, and one stock deduction per selected night. It also exercises real clipboard success and denied-clipboard fallback.
- Additional browser checks cover exclusive checkout, invalid dates/capacity, hidden stock counts, quantity bounds, explicit detail disclosure, preserving an over-limit selection after date changes, and restoration of older unsubmitted drafts.
- TypeScript, ESLint, production Webpack build and repository-wide Prettier checks passed. Pre-existing formatting-only differences were normalized. No staff application behavior was changed for this redesign.
- A mobile staff test initially raced the dialog's scheduled rate-field autofocus while filling another field. It now waits for the intended focus and asserts the original rate remains unchanged before testing the server-rejection path. The complete rerun passed.
- An independent reviewer inspected actual desktop/mobile renders against the approved mocks. Duplicate dates and singular guest labels were corrected; the final verdict was **ship**, with no remaining actionable visual issues observed. Screenshots/review are saved locally under ignored `output/integration-review/`.
- Configured local secrets were checked against all changed and nonignored new files, with no matches. Synthetic write tests restore their own fixtures and do not target production.

## Release and rollback

Deploy only after the above checks pass. This is an application-only release; rollback is promoting the prior Vercel deployment, with no database rollback or reset required. Prior production: `https://hill-resort-booking-j1zn7w26h-shans-projects-5a3cd5ba.vercel.app`.

Live smoke verification must stop before booking submission: inspect catalogue/galleries, select dates/quantities, retrieve a quote, review contact details and test-payment controls, and verify anonymous staff rejection. Production booking writes remain outside automated release smoke.

## Deployed review version

Vercel deployment `dpl_6SuGXrVX8HiN8zPzejhryVEJjcp5` is Ready: https://hill-resort-booking-9ck7h6l7a-shans-projects-5a3cd5ba.vercel.app, aliased to https://hill-resort-booking.vercel.app.

Live desktop/mobile smoke passed for galleries, mixed selection, derived guests, contact review, authoritative INR 73,000 inclusive quote, four nightly rows, review icon and switch states. Browser-script errors: none. The smoke explicitly blocked booking submissions; no production bookings were created. Anonymous staff access returned 401, and invalid confirmation API references returned 404. Confirmation persistence and copying were exercised on the isolated branch, not by creating production records.

Live screenshots are in ignored `output/integration-review/live-desktop-payment.png` and `live-mobile-payment.png`; final actual confirmation renders and the independent reviewer verdict are in the same folder. Static photo-credit findings from the Hallmark scanner are false positives for TSX-only inputs: credits are present in the rendered footer, with author and licence attribution. Render-only attempts on an HTML snapshot cannot resolve Next.js relative asset paths and are not accepted as runtime evidence. The composed date-picker summary has an intentional control-height waiver; ordinary quantity and action buttons remain compact.

The source remains uncommitted for owner review. The production application matches the verified integration; follow-up documentation and the explicit picker waiver do not alter runtime behavior. No schema migration, reseed or production stock mutation was part of release.

## Subsequent approved polish

The latest source integration is documented in [GUEST_POLISH_INTEGRATION_EVIDENCE.md](GUEST_POLISH_INTEGRATION_EVIDENCE.md). It adds new imagery, notifications/contact validation, draft-policy choices with an additive acceptance-receipt migration, and the email preview. That follow-up is available on the isolated local development review server; the production deployment documented above was not changed by that integration.

The approved guest polish is now released to both normal development and production; see [GUEST_POLISH_RELEASE.md](GUEST_POLISH_RELEASE.md). The production URL is https://hill-resort-booking.vercel.app/ and its current deployment is dpl_8orH3Ntq1fQsCuCQGgZTkKCD3Y8T. Earlier deployment references above describe prior releases and rollback history.
