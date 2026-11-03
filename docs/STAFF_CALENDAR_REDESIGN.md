# Approved staff calendar and guest footer

Owner approved the isolated mockups and filled woodland staff primary on November 3, 2026. This implements that design inside the existing Next.js application.

## Scope and unchanged contracts

- The staff calendar uses one row per room type, seven dates per page, room filtering and a selected-night editor. Mobile presents one date and opens the editor on selection. A loading skeleton, empty state, explicit retry and persistence/error messages cover real requests.
- React Aria RangeCalendar, Dialog, Popover and Modal primitives supply keyboard date navigation, focus management and dismissal. Typed dates remain available in a disclosure. The inclusive first/last stay-night selection converts to the existing API's exclusive `end`; the staff range remains 1–31 nights. Today uses the existing Asia/Kolkata date helper; the original default configured week remains available.
- Loaded server rows and unsaved per-night drafts are separate. Saving or refreshing one night preserves other drafts. The unsaved-night list can reopen a draft outside the displayed range; discarding is explicit and never writes to the server. A reset discards only the current draft, never reverses a persisted change. Navigation/sign-out warns before dropping unsaved edits.
- Price validation reuses the existing integer-paise and approved tax-band validation. Allotment is bounded by the current booked count and website ceiling. Only the original six PATCH fields are sent; booked counters, channel/physical stock and booking snapshots are never editable. Missing configuration has no synthetic price or inventory fallback.
- The inventory GET/PATCH handlers, authentication/session/role checks, sign-out request, database schema, migrations and booking/quote services are unchanged. A save is reported only after PATCH succeeds. A subsequent failed refresh explicitly distinguishes the persisted save from the refresh error.
- Calendar styles live in `src/app/staff/calendar.css`, imported only by the staff page. Legacy login styles and the shared design tokens remain unchanged. The approved filled-primary exception is recorded in root `DESIGN.md`.
- The guest page changes only inside its footer. Existing pre-footer JSX is unchanged, including fetching, header, hero, room catalogue and estate section. Added global CSS selectors are footer-scoped. Staff sign-in keeps `/staff/login`, and the demo notice, attribution and all disclosure links are preserved.
- Generated mockups/screenshots remain local under ignored `output/`; they are excluded from formatting/lint and are not part of the application release.

## Verification

- 38 unit tests pass, including civil-date arithmetic, inclusive/exclusive boundaries, 1/31-night acceptance and invalid-range rejection.
- All 102 existing database regression tests pass on the explicitly isolated test branch. Guards verified the test endpoint differed from development and shared demo. Existing concurrency, snapshot, stock-limit, tax and transactional booking assertions were retained.
- All 14 desktop/mobile browser checks pass against the built application and isolated database. The original Day 2 API, booking, access-control and catalogue assertions remain intact; only calendar UI selectors changed. New cases cover draft preservation, per-night payloads, failures, range paging, missing nights, keyboard focus, date-cell targets and mobile access. Follow-up tests cover the draft index.
- Production build, TypeScript, ESLint and Prettier pass. Authenticated screenshots at 1440, 1280 and 390px were inspected against the approved mockups; no browser page-script errors were recorded.
- Hallmark checks target the changed staff surface. The larger calendar-cell selection target has a documented control-height waiver; ordinary form controls remain at least 48px. The original guest content was not restyled to address unrelated design checks.

The initial browser run exposed ambiguous test alert selectors and repeated-login rate limiting. Tests now scope errors to the calendar and reuse a real authenticated worker session while retaining fresh per-test contexts and mobile device settings. Production auth limits were not changed.

The independent finish review prompted a direct index for off-range drafts. Its retry concern was checked against the existing Try again/Refresh paths and verified by browser tests. The contained mobile modal and explicit stay-night count retain the approved mockup behavior.

## Release and rollback

Work is isolated on `feat/approved-staff-calendar`, based on the matching local/remote main. Promote through the pull request and successful checks. No database migration, reseed, environment change or production booking write is needed for this release. Reverting the implementation commit restores the prior UI without a database rollback. Live verification should read the catalogue/calendar and exercise login/logout without changing production inventory.
