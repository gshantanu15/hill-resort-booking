# OpenRouter demo configuration

Owner-approved model: `google/gemma-4-26b-a4b-it:free` (November 2, 2026).

## Access and cost

The existing key is reused from ignored `.env.local` and stored as a sensitive Vercel production environment variable. `OPENROUTER_MODEL` is configured in both places. No keys belong in Git, browser bundles, output logs or chat. Requests originate from server-only code. There is no public AI endpoint in the day-one increment.

No paid credits or recurring budget is required for the selected free variant. The client accepts only model IDs ending in `:free`, supplies no fallback model, and requires zero-price provider routing. Switching to a paid model later requires deliberately updating that guard and agreeing a budget. Synthetic enquiries only; request bodies and completions are not logged by application code. Provider routing sets `data_collection: deny`; this is not a claim of zero retention across every service or a change to account-wide logging settings.

## Quotas and failure behavior

Plan for 50 free requests per UTC day and 20 per minute, shared with other free-model use on the OpenRouter account. The daily window rolls over at 05:30 IST. The account API confirmed a daily ceiling of 50 during setup. These are upstream limits, not guarantees of provider capacity. The client makes no automatic retries or paid fallback; it preserves Retry-After when returned. A 429, provider failure, malformed output or 45-second timeout is a safe failure for the later inbox to leave in manual review.

Day-four integration must enforce persistent application request limits across Vercel instances before exposing AI actions to reviewers. A process-local counter is not sufficient. The day-one operator check is bounded to four sequential synthetic enquiries and stops on the first failure.

## Structured output

The live free endpoint advertises `response_format`, but native strict JSON Schema routing returned HTTP 404 during setup. Use JSON object mode, describe the expected schema in the prompt, parse the response, and validate against a Zod domain schema before using any fields. The setup check validates the returned category; full extraction, uncertainty handling and drafts remain day-four work. No silent downgrade from failed schema mode happens at runtime.

## Verification

Run `npm run ai:check` explicitly to check authentication and attempt four sample classifications (wedding, room, offsite, complaint). This consumes free quota when requests succeed; it is intentionally excluded from automated CI. The script never displays credentials or complete upstream responses. Deterministic mocked tests cover JSON parsing, provider failures, rate-limit handling, missing credentials and rejecting paid configurations.

Setup authentication passed. Provider metadata confirmed zero input/output prices. Live inference encountered upstream HTTP 429 while the account still reported all 50 daily requests available; classification quality is not yet verified. Configuration can be complete while this provider-capacity check remains pending. Record a successful operator check before presenting AI classification as working.

References: [model](https://openrouter.ai/google/gemma-4-26b-a4b-it:free), [limits](https://openrouter.ai/docs/api/reference/limits), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).
