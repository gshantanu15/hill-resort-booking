# Local setup

Use Node.js 24 and npm. Run `npm ci`, copy `.env.example` to `.env.local`, and run `npm run dev`. Without a database, the home page shows an explicitly labelled sample catalogue.

For Neon, create a development branch and a separate demo branch. Set the appropriate PostgreSQL connection string in DATABASE_URL in the ignored `.env.local`. Use the development connection for local work; configure the demo connection in Vercel. Never paste connection strings into issues, documentation, or chat.

Run `npm run db:migrate` then `npm run db:seed`. Seeding is repeatable and preserves existing room records. Day one creates only the room catalogue; booking inventory and staff tables arrive on day two. Do not use `drizzle-kit push` against the shared demo database.

Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`. Browser checks: install Chromium with `npx playwright install chromium`, then `npm run test:e2e`.

Vercel: import gshantanu15/hill-resort-booking, retain automatic Next.js detection, configure the demo DATABASE_URL, and deploy. A connection-backed catalogue must display “Room catalogue connected to PostgreSQL.” If the variable is missing, the site is a sample preview and day one's deployment criterion remains incomplete.

OpenRouter access is pending. No model is selected and no AI request is made by this increment. Agree a small credit limit with the owner before configuring live integration. BETTER_AUTH_SECRET and BETTER_AUTH_URL are declared for day-two authentication; authentication is not implemented yet.
