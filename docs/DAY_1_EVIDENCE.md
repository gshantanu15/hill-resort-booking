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

## Remaining day-one work

- Vercel GitHub integration is verified: gshantanu15/hill-resort-booking, production branch main. CLI deployment and repository linking both work.
- OpenRouter fixed and verified: Gemma remains primary; owner approved free Dots fallback for the shared-pool 429. Authentication and wedding, room, offsite, complaint classifications all passed on the actual routed configuration. Responses attributed Dots. Twelve deterministic tests passed. No paid fallback; privacy policy preserved. See docs/OPENROUTER.md.
- Owner visual review approved November 2, 2026. Shared design philosophy saved in root DESIGN.md; local fonts and photo licenses retained. Production release checks are being completed in this design integration. Booking and staff login remain later increments. End-of-day review is reserved for the next turn.

Without DATABASE_URL, the local catalogue explicitly labels sample data. A configured database error is surfaced rather than silently replaced by samples.
