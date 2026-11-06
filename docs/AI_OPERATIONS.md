# AI operations and trial control

This guide describes the historical bounded OpenRouter trial and the deployed Day 4 application controls. Analyse remains staff-triggered; migration 0009 and the approved production configuration are verified. Trial measurements below are historical; see Production release state for current operations.

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

The local stop affects this standalone trial runner only, on this checkout. It does not pause another host or the application. The local stop is a convenience control, not a provider-side cancellation mechanism. Disabling a key blocks future calls; it cannot cancel or refund an accepted request.

## Safe setup

1. Manually add credits at [OpenRouter credits](https://openrouter.ai/settings/credits). Keep automatic top-up off. Review the fee, minimum purchase and checkout total. The runner caps inference at $5; that does not authorize a larger cash purchase. If checkout exceeds your intended all-in budget, pause rather than enabling automatic top-up.
2. Create a dedicated trial key at [OpenRouter API keys](https://openrouter.ai/settings/keys), preferably with a lifetime $5 cap. The existing key is already capped at $5 and should not be reused for unrelated work.
3. Store a dedicated trial key as OPENROUTER_TRIAL_API_KEY in ignored .env.local. If it is absent, the runner uses the existing OPENROUTER_API_KEY. Both must be regular inference keys, never management keys. Keep the $5 limit with no daily/weekly/monthly reset. Never paste it into chat, source, screenshots, logs or documentation.
4. Verify dry-run status, then run the explicit `--run` command only when the account shows sufficient credits and the local stop is clear.
5. The runner stops at the reservation limit, request cap or first transport/configuration failure. Semantically wrong but schema-valid results are recorded for review; they do not count as passing the evaluation. Re-running --run explicitly repeats the corpus and consumes new reservations. Do not delete the ledger to reset the allowance.

If a process crashes, its empty `private/ai-trial/running.lock` directory intentionally blocks new batches. Verify the old runner is no longer running before removing only that empty lock. Preserve ledger.json and every unconfirmed reservation. A damaged ledger fails closed.

## Application control and external off-switch

```powershell
$env:ENV_FILE='.env.local'; npm run ai:control -- status
$env:ENV_FILE='.env.local'; npm run ai:control -- disable
$env:ENV_FILE='.env.local'; npm run ai:control -- enable
```

The application requires `AI_INFERENCE_ENABLED=true` after restart. Its database disable flag is checked immediately before reservation/call, fails closed when missing or unavailable, and is intended to take effect within one second.

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

No provider error should lose an enquiry or overwrite staff edits. The implemented application retains this manual-review boundary.

Historical Milestone 5 verification: 73 unit tests passed, including 19 trial safety/file-lock/error cases. Dry-run, stop, status, disabled-run and resume were exercised. The initial unfunded preflight stopped before inference. After the owner funded credits, evaluation completed with 25 calls costing $0.0096023. See [results and proposed configuration](AI_MODEL_DECISION.md). A local file-replacement failure was repaired without discarding reservations or introducing provider retries; Windows file replacements now have bounded local-only retries.

## Application controls

Milestone 6 controls are implemented locally: fail-closed runtime/database gates, a persistent daily allowance of $1 or 100 calls, monotonic $5 ledger, conservative $0.05 reservation and unchanged provider $5 lifetime cap. The database flag is read immediately before reserving/calling; missing or unavailable controls mean no provider call. Provider failures preserve original enquiries, manual category/owner corrections and saved drafts. Intake success depends only on persistence, never on AI. Migration 0009 is applied to normal development and the isolated test branch.

References: [OpenRouter credits](https://openrouter.ai/settings/credits), [API keys](https://openrouter.ai/settings/keys), [create a new key](https://openrouter.ai/docs/api/api-reference/api-keys/create-a-new-api-key), [disable/update a key](https://openrouter.ai/docs/api/api-reference/api-keys/update-an-api-key), [pricing](https://openrouter.ai/pricing), and the verified Haiku 5.5 rate of $0.10/M input and $0.50/M output tokens as of November 5, 2026.

Milestone 6 application status: owner-approved and implemented locally. Analyse remains staff-triggered; the application controls are 100 requests/$1 per day, a monotonic $5 ledger and conservative $0.05 reservation per call, in addition to the provider key's $5 lifetime cap. The CLI pause control and provider-console key disable remain separate. Migration 0009 is applied to normal development and isolated tests; production is untouched.

## Production release state

Day 4 is deployed after explicit final approval. Production uses the verified $5 lifetime/no-reset inference key, pinned Haiku 5.5, AI_INFERENCE_ENABLED=true and the enabled database gate. The application caps remain 100 requests/$1 per UTC day and $5 lifetime, with conservative reservations. The CLI examples above remain development/test-only and reject production. For an app-independent stop, disable the dedicated project key in OpenRouter. A database operator may pause production with `UPDATE enquiry_ai_controls SET enabled=false WHERE id='enquiry-ai';`; do not delete usage rows or increase caps as part of stopping/resuming. Resuming requires intentional operator action and the environment gate; no enquiry is automatically analysed.
