# Day 3 — November 4, 2026

## Implementation

- Accommodation: owner-approved synthetic amenities keyed by room type, expandable catalogue details, illustrative-content notice, and per-room booking entry links. Capacities remain database-backed.
- Selection: `/book` collects common dates, totals and per-type guest allocations, and mixed quantities. Availability reads abort obsolete requests. Client guidance reuses the pure booking validators; the server remains authoritative.
- Review: required name/email, optional phone, nightly inclusive charges, quantities, guest allocations, included GST and paise-accurate totals from signed server quotes. Updated/expired quotes require explicit review acceptance.
- Payment: one outlined test-payment action, expandable successful/declined outcomes, no card fields. A pending request is saved synchronously before sending. Unknown responses preserve its exact payload and UUID, disable edits and permit unchanged retries after refresh. A known decline permits another attempt; unavailable stock returns to selection with contact details retained.
- Confirmation: persisted contact-free booking snapshots at a random reference, with noindex/no-referrer metadata. Missing references show a not-found page (the API returns 404; streamed Next.js pages may return HTTP 200); service failures offer retry of the same reference. Recovery storage is cleared only on the matching persisted confirmation page.
- No schema migration, payment provider, new dependency, message sending or commercial policy was added.

## Verification

- Baseline and final unit checks: **38 passed**. TypeScript, ESLint and the production Webpack build pass. Changed files pass Prettier.
- Complete isolated database suite: **102 passed** across five suites, including last-unit contention, staff-versus-booking races, mixed rollback, concurrent identical retries, tax, snapshots, stock bounds.
- The new browser journey books two rooms and one villa, refreshes review/contact details, declines payment and checks unchanged inventory, changes a nightly rate and requires renewed acceptance, loses a successful server response, refreshes and retries the exact request, then verifies one booking and one stock deduction on each occupied night. Scoped cleanup restores prices/counters and removes only the test booking.
- Browser runs use a production build and explicitly isolated database. The tests assert the test host differs from development/shared demo and matches the application's database. No production booking writes are performed.

## Execution notes

Sandbox DNS and generated-directory permissions caused initial failures. Outside-sandbox execution resolved them. An interrupted/concurrent regression attempt exposed temporary synthetic room fixtures to catalogue/seed checks; rerunning database checks sequentially passed all 102. Database and browser write suites must run sequentially against this shared isolated test branch.

Repository-wide `format:check` reports pre-existing formatting differences in staff/calendar files, package/configuration and their tests. These unrelated files were not reformatted; every Day 3 changed file passes its targeted formatting check.

The current test branch expires November 4 at 11:20 IST. Renew the isolated environment before subsequent write-based tests after that time. Payment, accommodation and data remain explicitly synthetic.

## Closing evidence

- All **18 desktop/mobile browser checks passed**, including staff authentication/authorization and calendar regressions, catalogue and guest booking tests. The additional throttled mobile catalogue run passed at 150 ms latency and 200 KiB/s download throughput; images loaded and layout remained usable.
- Production deployment is Ready: https://hill-resort-booking-j1zn7w26h-shans-projects-5a3cd5ba.vercel.app, aliased to https://hill-resort-booking.vercel.app.
- Live desktop and mobile smoke traversed selection, server quote, contact review and the test-payment screen without submitting any booking. No page-script errors were recorded. Live mixed quote: INR 73,000 inclusive across four room-type/night rows. Anonymous staff API returned 401; invalid confirmation API returned 404; the page rendered its not-found state.
- Selection, payment and confirmation screenshots were inspected. Durable live screenshots are in ignored `output/day3/live-desktop-payment.png` and `output/day3/live-mobile-payment.png`.
- Day 3 checklist completed. Source changes remain available in the working tree for review; no Git commit or push was performed.
