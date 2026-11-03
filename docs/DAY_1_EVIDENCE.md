# Day-one verification

Verified November 2, 2026. Public demo: https://hill-resort-booking.vercel.app
Repository: https://github.com/gshantanu15/hill-resort-booking

## Database configuration

- Project: plain-glade-53572554 (hill_resort_booking), PostgreSQL 18, AWS Singapore.
- Demo: existing production branch br-icy-thunder-ao36uwx2.
- Development: isolated branch br-dawn-truth-aoattqdc.
- Both computes: 0.25–0.5 CU; transaction pooling enabled. Account rejects idle-timeout changes, so suspend_timeout_seconds remains 0. Monitor free-plan compute usage.
- Existing neon_auth schema was present before application setup and preserved. Application authentication is still scheduled for day two; it does not use those managed tables yet.
- Tracked Drizzle migration applied to development first and then demo; three synthetic room types seeded in each.
- Local application uses pooled DATABASE_URL; migrations use DATABASE_URL_UNPOOLED. Local connections are in ignored environment files. Only the demo pooled connection is stored as a Vercel production secret.

## Deployment and checks

- Vercel project created; runtime pinned to Node 24; function region Singapore (sin1).
- Production deployment completed. Public unauthenticated request returned HTTP 200 and confirmed the PostgreSQL catalogue label, Estate room and Estate villa.
- TypeScript, ESLint, Prettier, Vitest (1 test) and production build passed for the foundation. Desktop/mobile Playwright checks passed again with Neon configured, including image loading and horizontal overflow checks.
- Initial GitHub CI passed: https://github.com/gshantanu15/hill-resort-booking/actions/runs/41441951386 . Neon/Vercel configuration CI also passed: https://github.com/gshantanu15/hill-resort-booking/actions/runs/41445748192 .
- Owner-approved photographic design replaces the foundation imagery with locally served, credited Wikimedia photographs. Hallmark checks reported no FAIL or REFLEX findings; original navigation and room data preserved.
- Dependency audit reported moderate tooling advisories involving Drizzle Kit's transitive esbuild packages. No forced downgrade applied.

## Completed day-one setup

- Vercel GitHub integration is verified: gshantanu15/hill-resort-booking, production branch main. CLI deployment and repository linking both work.
- OpenRouter fixed and verified: Gemma remains primary; owner approved free Dots fallback for the shared-pool 429. Authentication and wedding, room, offsite, complaint classifications all passed on the actual routed configuration. Responses attributed Dots. Twelve deterministic tests passed. No paid fallback; privacy policy preserved. See docs/OPENROUTER.md.
- Owner visual review approved November 2, 2026. Shared design philosophy saved in root DESIGN.md; local fonts and photo licenses retained. Production integration verified: CI and Vercel deployment passed, and the live page was visually checked. Booking and staff login remain later increments. End-of-day review completed; see closing evidence below.

Without DATABASE_URL, the local catalogue explicitly labels sample data. A configured database error is surfaced rather than silently replaced by samples.

## Approved design production release

- Source commit: 16711f7 (Publish approved resort design and shared design philosophy).
- GitHub CI: https://github.com/gshantanu15/hill-resort-booking/actions/runs/41478309224 , success.
- Vercel deployment: hill-resort-booking-n5xjnbz4c-shans-projects-5a3cd5ba.vercel.app , Ready.
- Public alias: https://hill-resort-booking.vercel.app . Opened and visually checked after deployment.
- Live checks passed: room navigation, expandable description, PostgreSQL catalogue disclosure, photography credits, four loaded images, locally loaded fonts and no horizontal overflow in the inspected viewport.
- Local release checks: types, lint, formatting, 12 unit tests, desktop/mobile journeys and production build passed. Cold font retrieval and hashes passed; restricted Sentient binaries are excluded from the repository and fetched at install/build time.
- No database migration, rate/allotment change, API-key change or new OpenRouter call was required for this design release.
- All day-one task checkboxes and the end-of-day review are complete.

## Closing review — November 2, 2026

Consolidated on November 3 from the completed closing review in the project chat, "Create 6-day project master plan". This records historical results; the reconciliation did not rerun these checks.

| Exit criterion                  | Closing-review evidence                                                                                                                                                                                                 | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Documented fresh-checkout setup | Clean tracked-source export outside the workspace, without credentials or existing dependencies: install, font retrieval, type checks, 12 tests, build, and startup passed. All three rooms served in sample-data mode. | Pass   |
| Passing CI                      | [Closing CI run](https://github.com/gshantanu15/hill-resort-booking/actions/runs/41478792800) passed for closing source commit `bd416b3`.                                                                               | Pass   |
| Deployed seeded rooms           | Public alias returned HTTP 200, disclosed PostgreSQL, and rendered Estate room, Garden room, and Estate villa.                                                                                                          | Pass   |
| Private material excluded       | Scan of 100 reachable historical file versions found no current-secret or credential-pattern matches, private brief paths/blob, or selected confidential client figures. Limited to the checks performed.               | Pass   |

The clean-source rehearsal proved credential-free sample mode. Database-backed operation was verified separately on production; a new developer still needs connection settings for Neon.

### Carry-forward items

- Booking, inventory, authentication, and administration remain Day 2 work; existing tests do not prove their correctness.
- Closing dependency audit reported 20 moderate tooling advisories and no high/critical findings. Assess compatible fixes deliberately; no forced upgrades were applied.
- Monitor Neon compute usage because idle-suspension configuration was unavailable under this account. Free AI provider capacity and the preview fallback remain operating constraints; see `docs/OPENROUTER.md`.
- Day 1 has no unfinished feature blocking Day 2. Next action: inventory-model discussion using the atomic checklist in `docs/MASTER_PLAN.md`.
