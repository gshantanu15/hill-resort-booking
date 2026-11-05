# AI operations and trial control

This guide describes the approved, manually controlled OpenRouter trial for the enquiry demo. It does not activate AI in the application. Day 4 milestone 6 application integration follows the separate configuration gate; the application runtime kill flag and persistent daily budget described below remain proposed future work.

## Approved trial boundary

- Model: Anthropic Claude Haiku 5.5 through OpenRouter only. No second model fallback is permitted. OpenRouter may use same-model provider routing when the provider policy remains privacy-strict.
- Budget: owner-approved **$5 cumulative maximum**, with a reservation of **$0.05 per call** and at most 100 calls. The reservation ledger is monotonic and does not reset.
- Inputs: 13 synthetic resort enquiries only. Never send real guest messages or personal information.
- Controls: one-process lock, 30-second timeout, no automatic retries, dry-run by default, and explicit paid execution.
- Read-only post-trial metadata: the owner funded $5; usage is $0.0096023 and the key has $4.9903977 remaining of its $5 lifetime allowance, with no reset. The local trial is stopped after evaluation.

Trial commands from the repository root:

```text
npm run ai:trial                 # dry run; no provider call
npm run ai:trial -- --run        # explicit paid trial, after funding and checks
npm run ai:trial -- --run --case=room-complete-dates # one explicitly selected case
npm run ai:trial -- --stop       # persist private/ai-trial/disabled
npm run ai:trial -- --resume     # explicitly clear the local stop; does not spend
npm run ai:trial -- --status     # local status only; no provider call
```

The local stop affects this standalone trial runner only, on this checkout. It does not pause another host or the future application. The local stop is a convenience control, not a provider-side cancellation mechanism. Disabling a key blocks future calls; it cannot cancel or refund an accepted request.

## Safe setup

1. Manually add credits at [OpenRouter credits](https://openrouter.ai/settings/credits). Keep automatic top-up off. Review the fee, minimum purchase and checkout total. The runner caps inference at $5; that does not authorize a larger cash purchase. If checkout exceeds your intended all-in budget, pause rather than enabling automatic top-up.
2. Create a dedicated trial key at [OpenRouter API keys](https://openrouter.ai/settings/keys), preferably with a lifetime $5 cap. The existing key is already capped at $5 and should not be reused for unrelated work.
3. Store a dedicated trial key as OPENROUTER_TRIAL_API_KEY in ignored .env.local. If it is absent, the runner uses the existing OPENROUTER_API_KEY. Both must be regular inference keys, never management keys. Keep the $5 limit with no daily/weekly/monthly reset. Never paste it into chat, source, screenshots, logs or documentation.
4. Verify dry-run status, then run the explicit `--run` command only when the account shows sufficient credits and the local stop is clear.
5. The runner stops at the reservation limit, request cap or first transport/configuration failure. Semantically wrong but schema-valid results are recorded for review; they do not count as passing the evaluation. Re-running --run explicitly repeats the corpus and consumes new reservations. Do not delete the ledger to reset the allowance.

If a process crashes, its empty `private/ai-trial/running.lock` directory intentionally blocks new batches. Verify the old runner is no longer running before removing only that empty lock. Preserve ledger.json and every unconfirmed reservation. A damaged ledger fails closed.

## External off-switch

In the OpenRouter console, update the project key to `disabled: true` using the documented [API-key update operation](https://openrouter.ai/docs/api/api-reference/api-keys/update-an-api-key), or disable it in the console. This is reversible. Delete or rotate the key if it may have been exposed; that requires replacing it in a future deployment. The application must never contain an OpenRouter management key.

The off-switch blocks future calls but does not guarantee cancellation or refund of requests already accepted by the provider.

## Failure handling

| Failure                              | Trial action                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 401/403 authentication               | Stop before further calls; do not retry automatically. Check the dedicated key and permissions. |
| 402 funding/credits                  | Stop further calls; fund manually and rerun explicit `--run`.                                   |
| 429 rate limit                       | Stop and preserve the case for manual review; no automatic retry.                               |
| Provider outage                      | Stop and preserve the case for manual review.                                                   |
| Timeout at 30 seconds                | Stop and preserve the case for manual review.                                                   |
| Malformed, truncated or empty output | Stop and preserve the case; do not infer missing details.                                       |
| Unexpected provider details          | Stop, record only a safe error category, and preserve the enquiry/edits.                        |

No provider error should lose an enquiry or overwrite staff edits. The future application integration must retain the same manual-review boundary.

Verification: 73 unit tests pass, including 19 trial safety/file-lock/error cases. Dry-run, stop, status, disabled-run and resume were exercised. The initial unfunded preflight stopped before inference. After the owner funded credits, evaluation completed with 25 calls costing $0.0096023. See [results and proposed configuration](AI_MODEL_DECISION.md). A local file-replacement failure was repaired without discarding reservations or introducing provider retries; Windows file replacements now have bounded local-only retries.

## Future application controls

Day 4 milestone 6 application integration has not started. A runtime database kill flag defaulting off, fail-closed environment handling, and a persistent daily application budget of $1 or 100 calls are approved at the final configuration gate. They are not implemented by this guide and must be implemented and tested before the staff Analyse action is enabled. Keep the existing $5 lifetime project-key cap unless the owner separately raises it; a daily allowance must not silently replace that total cap. The database kill flag must be read immediately before reserving/calling; a missing flag or unavailable database means no provider call. Provider failures must preserve original enquiries, manual category/owner corrections and saved drafts. Intake success depends only on persistence, never on AI.

References: [OpenRouter credits](https://openrouter.ai/settings/credits), [API keys](https://openrouter.ai/settings/keys), [create a new key](https://openrouter.ai/docs/api/api-reference/api-keys/create-a-new-api-key), [disable/update a key](https://openrouter.ai/docs/api/api-reference/api-keys/update-an-api-key), [pricing](https://openrouter.ai/pricing), and the verified Haiku 5.5 rate of $0.10/M input and $0.50/M output tokens as of November 5, 2026.
