# OpenRouter enquiry assistance

Milestone 5's paid configuration is owner-approved. Milestone 6 implements it locally and is owner-approved; production release is verified. See [model decision](AI_MODEL_DECISION.md), [evaluation results](AI_EVALUATION_RESULTS.json) and [operator controls](AI_OPERATIONS.md).

## Current application routing

- The only permitted model is `anthropic/claude-haiku-5.5`, pinned in server code. `OPENROUTER_ENQUIRY_MODEL`, if supplied, must match. Legacy `OPENROUTER_MODEL` and `OPENROUTER_FALLBACK_MODEL` variables are ignored by this path.
- OpenRouter may route between providers of this same model, with required parameters, `data_collection: deny` and maximum input/output prices of $0.10/$0.50 per million tokens. There is no fallback to another model or a free pool, and no application retry loop.
- Requests use native strict JSON schema, reasoning disabled, at most 1,500 output tokens, a 30-second deadline and a 20,000-byte serialized request ceiling. Server validation checks output again before saving it.
- Staff explicitly selects Analyse on a saved enquiry. Original messages persist independently of AI. Omitted years default to the current Asia/Kolkata calendar year with staff provenance; vague dates and unknown adult/child splits remain unfilled. Budget is optional. Verified catalogue amenities and estate facts are supplied so replies answer questions before asking for material clarification. Application rules apply team routing; complaints retain GM attention.
- Drafts are price-free prose. Email drafts use a subject, greeting, separated paragraphs/proposal bullets and team signature. The application keeps one `[Sales-approved quote]` slot before the event email closing. Reservations quote slots describe the known accommodation request and are replaced by authoritative quote insertion. Accommodation prices come only from the separate staff quote action using current booking rates, tax and inventory. Venue/event pricing and availability remain manual Sales work.
- Manual routing and drafts require explicit replacement; revision checks protect edits made during inference. Nothing sends automatically.

## Credentials, privacy and controls

The inference key stays in ignored environment files and server secrets. Contact columns are excluded from prompts; embedded email and explicit phone patterns are redacted. Redaction does not anonymize all personal information in free text. Use synthetic data for review. No prompt/completion or raw provider-error logging is added. `data_collection: deny` is not a zero-retention guarantee.

Both `AI_INFERENCE_ENABLED=true` and the database enable flag are required. Controls fail closed. Durable reservations enforce 100 requests/$1 per UTC day and a monotonic $5 lifetime application ledger. Each call reserves $0.05 before inference; reported successful costs reconcile that amount, while unknown costs retain the reservation. The provider key separately retains its $5 lifetime/no-reset cap. Do not delete ledgers to reset spending.

Use `npm run ai:control -- status`, `-- disable` or `-- enable` with the intended `ENV_FILE`. Database disable is checked before the call, during execution and before results apply. Disabling the key in OpenRouter is the external stop independent of the app. Accepted requests may still incur charges. Authentication, funding and configuration failures pause the database switch; other failures remain explicit manual-review outcomes. See [operations](AI_OPERATIONS.md) for exact PowerShell commands.

`npm run ai:check` now reports configuration only and never performs inference. The standalone `ai:trial` evaluator is separate, dry-run by default and remains stopped after Milestone 5. Its local stop does not control application inference.

Migration 0009 is applied to isolated tests and normal development. It protects all pre-existing routing/drafts and seeds AI paused. Production migration and deployment are complete after final approval.

## Historical free-model investigation

The November 2 standalone Gemma-first/Dots-fallback experiment passed four categories after Gemma's shared pool returned upstream 429s. That free-only transport, zero-price guard and 45-second timeout have been replaced locally by the approved paid path above. Hosted legacy environment values have not been changed; they do not authorize a production rollout.
