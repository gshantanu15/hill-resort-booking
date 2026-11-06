# Day 5 evidence — November 6, 2026

Status: implementation and validation complete; ready for owner review, production approval pending. Branch: `day5-reviewer-readiness`.

## Changes and review

- Added Fill demo credentials without automatic submission; explicit sign-in, busy state, error recovery and keyboard focus remain.
- Added a dry-run-by-default operator reset with direct endpoint/database confirmation, bounded locks, configuration/calendar checks, active-AI refusal and atomic restoration. No public reset endpoint. Staff/authentication, migrations, AI controls and spending records survive.
- Corrected preview-origin fallback for authentication. Explicit BETTER_AUTH_URL takes precedence; production fallback is preserved.
- Added isolated hosted regression configuration; production aliases are rejected. Private protection bypass is supplied through environment and scoped to the deployment cookie domain.
- Updated setup/reviewer/reset instructions and stale Day 4 deployment wording. Approved design, prices and policies are unchanged. No migration is needed.

## Validation record

Unit checks: 87 passed. TypeScript, ESLint, repository formatting and production Webpack build passed. The initial sandbox runs failed on network access and Windows temporary/generated-directory operations; the same checks were rerun outside the sandbox without weakening application safeguards.

An intermediate complete database run passed 130 tests. Added forced rollback and lock-contention cases then passed, but an unrelated 26-row pagination fixture exceeded its 20-second timeout. That pagination setup now uses one bulk insert while retaining all assertions; separate intake tests still exercise real persistence. Final complete database result: **132 passed across nine suites** (197.80 seconds), including concurrency, retries, administration, access boundaries, AI failure recovery and all five reset integration cases.

An intermediate browser run passed 47/48 cases. The desktop synthetic AI assistance response remained busy beyond the default five-second assertion; the equivalent mobile case passed. The assertion now allows the existing 30-second analysis boundary. Credential-fill checks passed on desktop/mobile. Final complete production-build browser result: **48 passed** (4.6 minutes), with no skips. After refining readiness assertions, all four affected local desktop/mobile cases passed again (1.3 minutes).

Manual screenshot inspection covered mobile payment and desktop staff detail: clear test-payment/unsent/source disclosures, readable totals and no observed clipping. The catalogue regression exercises mobile throttling at 150 ms latency and 200 KiB/s download, verifies all images loaded and checks horizontal overflow. Existing responsive image sizing is retained; no demonstrated image defect justified changing approved assets.

## Hosted boundary

Automatic approval review initially rejected uploading isolated database credentials to Vercel. The owner explicitly approved that transfer; the retry created the protected preview at https://hill-resort-booking-8sugr2ahr-shans-projects-5a3cd5ba.vercel.app . Preview credentials are test-only, AI is disabled and the production alias/configuration are unchanged. Protected preview sign-in HTML includes the credential-fill control. Full hosted regression result: **30 passed** (2.4 minutes), no skips. Five additional real hosted checks verified staff login, the disabled inference gate, synthetic intake, rejected analysis and enquiry preservation; the fixture was removed. No provider calls were made.

No production seed, reset, migration, deployment, booking write or rate/inventory mutation was performed. No paid inference was performed. Shared-demo reset execution remains a separately approved maintenance operation.

The first hosted attempt encountered Vercel protection pages; the client was corrected to use a private domain-scoped access cookie. The next run exposed network-idle waits hanging on Vercel toolbar activity; those waits were removed in favour of existing visible-control/navigation assertions. An intermittent mobile sign-in rejection did not reproduce in focused checks or the final complete run; the test now asserts the HTTP response explicitly. All four focused hosted rechecks passed before the final complete run. A local follow-up showed that navigation also needs the calendar initial load to settle; the test now explicitly awaits aria-busy=false. All four affected local cases and both affected hosted cases then passed. Deployment protection and application authentication limits were retained.

## Remaining limits

The refreshed npm audit reports 12 moderate findings, zero high and zero critical. Proposed remedies include major toolchain downgrades; no forced dependency changes were applied. The working Webpack workaround remains. AI provider uptime/quality is covered by historical Day 4 evidence; current deterministic checks exercise mocked responses/failures and manual fallback.

Day 5 implementation is ready for owner review. Release remains pending owner approval, staged production verification and approved promotion. Local review is available at http://localhost:3000/staff/login on the isolated database with AI disabled; the hosted preview uses the same application changes. Day 6 release tagging, clean-setup rehearsal and final handover audit remain planned separately.
