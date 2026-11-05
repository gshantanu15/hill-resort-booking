# OpenRouter demo configuration

Verified November 2, 2026 after all four live sample classifications passed.

November 5 milestone 5: the owner approved milestone 4 (commit `dee1070`) and authorized paid-model research. The running free configuration below is unchanged. See [current research and trial decision](AI_MODEL_RESEARCH.md) and [synthetic evaluation corpus](AI_EVALUATION_CASES.json). System One was clarified as decision models such as Jev; the owner has now selected Haiku 5.5 only with a $5 cumulative trial ceiling. The owner funded $5 and synthetic evaluation completed for $0.0096023. Final integration configuration is owner-approved; see [measured results and decision](AI_MODEL_DECISION.md). See [setup, limits and emergency stop](AI_OPERATIONS.md). Paid inference was restricted to the standalone synthetic evaluator. No hosted configuration change has occurred. `npm run ai:trial` is a separate dry-run-by-default evaluator; explicit `--run` requires funding and a $5-or-lower lifetime key limit. The application transport below remains unchanged.

## Model routing

- Primary: `google/gemma-4-26b-a4b-it:free` (`OPENROUTER_MODEL`).
- Owner-approved fallback: `dots-studio/dots-3-note-preview:free` (`OPENROUTER_FALLBACK_MODEL`).
- Both are configured locally and on Vercel production. An empty fallback variable explicitly disables fallback for isolated diagnostics.
- OpenRouter receives an ordered models array and handles failover within a single HTTP request. Our client does not run retry loops. Responses retain the actual serving model for verification and later staff-facing attribution.
- Only IDs ending in `:free` are accepted. Zero-price provider routing applies to both. A paid primary or fallback is rejected before any request. A future paid switch requires updating that guard and agreeing a budget.

## Root cause and fix

Gemma's shared Google AI Studio pool returned HTTP 429 with `limit_source=upstream_provider_shared_pool`. Authentication was valid and the account still had its full daily allowance. This was provider-pool throttling, not an invalid key or exhausted account quota. Another Gemma endpoint also returned pool throttling; some independent free endpoints were blocked by the existing account data policy. Those policies were preserved.

Dots accepted the existing JSON, privacy and zero-price constraints. First it passed all four classifications in isolation; then the actual Gemma-first/fallback route passed wedding, room, offsite and complaint examples. Each routed response identified Dots as the serving model. The checklist was only checked off after that end-to-end run succeeded.

## Access and quotas

The API key lives in ignored `.env.local` and Vercel production secrets. No key belongs in Git, browser bundles, logs or chat. Calls are server-only; no public AI endpoint is exposed in this increment. Synthetic enquiries only, with no application logging of prompt/completion contents. Routing retains `data_collection: deny`; this is not a claim of zero retention or a change to account-wide logging settings.

Plan for 50 free requests per UTC day and 20 per minute, shared with other account use. The daily reset is 05:30 IST. Free endpoints can still be unavailable before those limits are reached. Fallback cannot bypass OpenRouter account-wide quotas. If both models fail, return a safe error for later manual review. Retry-After is preserved, and the client timeout is 45 seconds for the entire routed request.

Before exposing AI actions in day four, enforce durable request limits across Vercel instances. A local memory counter is insufficient. Native provider fallback handles upstream errors; invalid JSON, truncated output and failed domain validation remain manual-review failures, not reasons for an application retry loop.

## Output and verification

Gemma supports JSON mode without native JSON-schema enforcement. The request includes the expected schema in the system prompt; the transport parses JSON and returns `{ data, model }`. Callers must validate data against their Zod domain schema. The setup command validates categories. Full extraction, uncertainty and reply drafting remain day-four work.

`npm run ai:check` explicitly checks authentication and four synthetic classifications. It is not part of automated CI and stops on the first failure. Automated tests cover free-only routing, fallback order, model attribution, provider/shared-pool throttling, malformed output, missing credentials and paid-model rejection.

The fallback is a preview: OpenRouter lists its removal date as December 31, 2026. Re-evaluate before extending this demo beyond the six-day build.

References: [Gemma](https://openrouter.ai/google/gemma-4-26b-a4b-it:free), [Dots](https://openrouter.ai/dots-studio/dots-3-note-preview:free), [model fallback routing](https://openrouter.ai/docs/guides/routing/model-fallbacks), [limits](https://openrouter.ai/docs/api/reference/limits).
