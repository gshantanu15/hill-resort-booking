# Day 5 evidence — November 6, 2026

Status: **Day 5 complete and deployed.** The owner approved production release. Application commit `b098b3241fd8dd62aec11579ac920077ceb051fc` is published on `main`; the earlier review-pending notes below are historical and superseded by the completed release section.

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

## Completed production release

The owner approved the candidate and explicitly instructed proceeding. GitHub CI passed for the reviewed branch and for main ([main CI](https://github.com/gshantanu15/hill-resort-booking/actions/runs/42171569965)). Production migration hashes match all ten tracked SQL files; no migration, seed or reset ran.

Git-triggered deployment from main is disabled through the documented Vercel repository configuration. Main was fast-forwarded to the approved commit, and the public alias remained on its prior deployment while the CLI production deployment built with `--prod --skip-domain`. No production environment variables or AI gates/caps were changed.

The staged build passed 32 desktop/mobile checks before promotion. The initial staged quote probe correctly rejected a mismatched Origin; the smoke client was corrected to use the staging origin for quotes and the configured public origin for authentication. The subsequent complete staged run passed. Promotion then assigned https://hill-resort-booking.vercel.app to deployment `dpl_DxAppz3hA2fYJ1heKPoRgwhtNDbq`, and all 32 public production checks passed. Checks cover catalogue, credential fill, staff login/logout/access control, calendar/inbox reads, authoritative quote arithmetic, existing-confirmation privacy, responsive layouts and unchanged AI gate/daily limits. There were no browser errors, booking/calendar/enquiry mutations or inference calls. Authentication sessions were exercised normally.

Pre/post read-only transaction snapshots match for all nine bookings, ten booking items, seventeen booking nights, 540 inventory rows, 540 rates, three room types, one rate plan, two enquiries, AI controls, all four AI usage records and ten migrations. The deployment-scoped runtime query for error/fatal records returned zero entries with no excluded intervals. See [sanitized smoke evidence](DAY_5_HOSTED_SMOKE.json); screenshots and private hashes/logs remain ignored locally under output/release.

Rollback target: `dpl_9exjseu2QM973KWNAPJWf3GU8f6L`, https://hill-resort-booking-q9im28kd8-shans-projects-5a3cd5ba.vercel.app . Re-promote that application deployment if needed; do not roll back or reset the database. Day 6 final handover/release tagging remains pending.
