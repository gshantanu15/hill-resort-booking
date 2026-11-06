# Day 5 operations — November 6, 2026

## Reviewer walkthrough

1. Browse the catalogue and galleries. At `/book`, select mixed accommodation and guest allocations within the seeded calendar (November 3, 2026–May 1, 2027; checkout through May 2).
2. Review nightly prices and included tax, enter synthetic contact details and accept the separate draft notices. Exercise declined payment then success on the isolated review environment. Refresh confirmation and verify exact retries do not duplicate bookings.
3. At `/staff/login`, use **Fill demo credentials**, then **Sign in**. The displayed synthetic account is `staff@aavana.example` / `EstateDemo!2026`.
4. In Calendar, change a rate, allotment and blackout and inspect availability/quote effects. Use the isolated review environment for write experiments.
5. Submit a website enquiry at `/enquire`. At `/staff/enquiries`, inspect it, add simulated email/WhatsApp enquiries, correct routing and save an unsent draft.
6. Explicitly Analyse a synthetic enquiry when enabled. Verify uncertainty, complaint GM attention, protection of manual edits and authoritative accommodation quote insertion. Event packages remain manual Sales handling.

## Operator reset

There is no reset HTTP endpoint. The command deletes synthetic bookings/enquiries and restores the approved 180-night calendar. Authentication, migrations, AI controls and spending records survive; deleted enquiry links in usage records become null. Spending allowances never reset.

Verify the Neon branch/database identity and direct endpoint. Only the known demo or isolated Day 4 test host is accepted. Replacement test endpoints require deliberate verification before allowlist updates.

Set `ENV_FILE` to the intended ignored environment file and run `npm run db:reset-demo`. This dry-run validates the configured target without connecting or changing data; it does not prove database reset compatibility.

Execution requires `npm run db:reset-demo -- --execute --confirm=<exact-direct-hostname>`. Shared-demo execution requires separate owner approval. Do not execute during release smoke. Confirm a recoverable backup/Neon restore point, arrange a quiet maintenance window and ensure no enquiry is processing. The command uses bounded table locks and one transaction; unexpected configuration or lock failure prevents commit. Investigate failures before retrying.

After execution verify 540 inventory/rate rows, zero bookings/enquiries, approved prices/allotments/open nights, staff access and unchanged AI allowances. Clear old browser booking/enquiry drafts and references. End maintenance after verification. An unexpected committed outcome requires the verified restore point; never delete AI ledgers.

## Release gates

Git-triggered production deployment from `main` is disabled in `vercel.json`; previews remain enabled. Publish source and verify CI, then stage a CLI production deployment with `--prod --skip-domain`, verify it, and explicitly promote it. This keeps a main-branch push from bypassing the release checks. Production application and AI environment settings are unchanged.

No push to main, production migration, seed, reset or deployment before final release approval. Full hosted write journeys require an isolated hosted candidate with verified test database and authentication settings. Production smoke blocks booking and calendar writes. Record current deployment and data hashes, stage without moving the public alias, verify, then promote. On failure roll back application code to the recorded deployment; do not destructively roll back data.

Keep credentials, quote tokens, confirmation references and raw fixtures out of public evidence. Record actual results and skips. Historical test counts do not prove a new candidate.
