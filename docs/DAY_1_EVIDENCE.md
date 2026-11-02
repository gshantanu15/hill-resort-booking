# Day-one verification

Connection-dependent tasks remain pending: Neon project/connection, Vercel account/deployment, OpenRouter key/model/budget. No live AI calls made.

The local catalogue uses clearly labelled sample data only when DATABASE_URL is absent. A configured database error is surfaced as an error, never silently replaced with sample data. No availability or booking functionality is claimed in this increment.

Verified locally on November 2, 2026:

- TypeScript: passed.
- ESLint: passed without warnings.
- Prettier: passed.
- Vitest: 1 test passed (seed contract).
- Production build: passed on host. Sandbox Turbopack CSS worker failed to start; host build succeeds.
- Playwright: desktop and mobile catalogue navigation passed. Screenshots are in ignored test-results/.
- Drizzle migration generated, not applied: Neon access pending.
- Hallmark static sweep: zero failures/reflex findings; stock photography provenance warning remains for illustrative Unsplash hotlinks. Visual review pending screenshot inspection.
- Dependency installation reported moderate advisories. The targeted audit traces the remaining production-graph report to Drizzle Kit's esbuild tooling; no forced downgrade applied. Review dependency advisories before production use.

Repository: https://github.com/gshantanu15/hill-resort-booking
Day one remains incomplete until Neon, Vercel deployment, OpenRouter configuration and owner design review are finished. Later-day functionality is not implemented in this increment.

Desktop/mobile screenshots inspected: room images load, page hierarchy remains readable, and no horizontal overflow was detected. GitHub CI run: https://github.com/gshantanu15/hill-resort-booking/actions/runs/41441805047 (status to be checked separately).
