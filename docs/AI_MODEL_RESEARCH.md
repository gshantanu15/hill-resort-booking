# Day 4 milestone 5: model research

Research date: November 5, 2026. Status: the owner approved a $5 trial budget and Haiku 5.5 via OpenRouter only. Paid evaluation is complete; the owner approved the integration configuration in [AI_MODEL_DECISION.md](AI_MODEL_DECISION.md). Twenty-five synthetic inference calls cost $0.0096023. The final prompt was reviewed on 13 cases; measured results, initial defects and actual sample outputs are in [AI_EVALUATION_RESULTS.json](AI_EVALUATION_RESULTS.json).

Milestone 4 is owner-approved and committed as `dee1070`. Model research started afterward. The owner clarified that “System One” means decision models such as Jev, rather than a particular general-purpose chat model.

## Workload and shortlist

The application needs five-way category classification, conservative extraction of dates/guests/budget/uncertainty, and an editable reply draft. Team assignment and complaint escalation remain application rules. A paid pool reduces dependence on free capacity; it does not guarantee availability. The owner selected Haiku 5.5 after this comparison. Other candidates remain research context; they are not approved trial targets or fallbacks. Synthetic evaluation is still required.

Prices are USD per million input/output tokens, checked against the linked official pages. The per-1,000 example assumes 2,000 input and 800 output tokens per enquiry, with no cache discounts, reasoning surcharge, retries, credit-purchase fees or taxes. These are calculated examples, not measured usage or a billing guarantee.

| Candidate                    | Input / output                  | Example per 1,000 enquiries    | Role and limitation                                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anthropic/claude-haiku-5.5` | $0.10 / $0.50 for short prompts | $0.60                          | First candidate for primary: official positioning includes classification, extraction and routing. OpenRouter lists JSON-schema output and multiple providers. Resort accuracy and end-to-end latency remain unmeasured. Released October 7, so operating history is short. |
| `openai/gpt-5.4-mini`        | $0.75 / $4.50                   | $5.10                          | Cross-vendor fallback candidate and comparison baseline. Official OpenAI documentation supports structured outputs and reasoning effort `none`. Actual account access and eligible providers remain to be checked.                                                          |
| `google/gemini-3.8-flash`    | $0.75 / $3.75 currently         | $4.50                          | Third text-model candidate, supporting structured output. Thinking cannot use `minimal`; evaluate low effort and bill thinking tokens. Google currently lists promotional pricing through December 31, 2026; recheck before extending the project.                          |
| `typesafe/jev-1.14`          | $0.042 / $0                     | $0.084 for classification only | Typed category/complaint decisions with probabilities, not a reply generator. A separate model is still required for prose; the model page currently lists one provider. Evaluate as an optional classifier, not a replacement for the full workflow.                       |

Sources: [Haiku pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Haiku model and providers](https://openrouter.ai/anthropic/claude-haiku-5.5), [GPT-5.4 mini official model reference](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [GPT OpenRouter listing](https://openrouter.ai/openai/gpt-5.4-mini), [Gemini model capabilities](https://aistudio.google.com/docs/models/gemini-3.8-flash), [Gemini pricing](https://aistudio.google.com/docs/pricing), [Gemini OpenRouter listing](https://openrouter.ai/google/gemini-3.8-flash), [Jev model](https://openrouter.ai/typesafe/jev-1.14).

Older Haiku 4.5 and Gemini 2.5 Flash were considered but are not the initial shortlist. GPT-5.6 Terra is a stronger, more expensive comparison option at $2/$12; it is not necessary for the first cost-sensitive trial. If the shortlist fails the quality gate, reconsider a stronger model rather than weakening the gate. [Official Terra reference](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

## Jev and System One

Jev is directly relevant to the category decision: a typed Choice can select Room, Wedding, Offsite, Complaint or Unsorted. A separate boolean-style question can test whether a complaint needs attention. Its output contract avoids parsing generated category prose; it does not establish that the chosen category is correct or that confidence is calibrated for resort enquiries.

It cannot produce the reply draft. Open-ended extraction also needs more than selecting a fixed category: candidate spans/values and ambiguity must be handled explicitly. Using Jev plus a text model adds another call, failure mode and integration contract. The Decisions API is separate from the existing Chat Completions transport; Jev is not a drop-in model ID for `requestStructuredOutput`.

Decision after owner selection: defer Jev trials and integration. Use the chosen structured text model for the initial evaluation; reconsider Jev only if later evidence justifies a separate classifier. Do not route team ownership probabilistically: keep the agreed category-to-team map and complaint/Unsorted attention rules in application code. Jev Router, which selects a serving model dynamically, is a different feature and is not proposed for this small, bounded workload. [Official Jev guide](https://openrouter.ai/docs/guides/community/jev).

## Evaluation and decision gate

Use only synthetic text, including the four setup examples and synthetic variants of the owner's resort examples. Executed corpus: 13 cases in `AI_EVALUATION_CASES.json`, including a final complete-date positive case. No existing inbox contact information or messages are sent to a provider.

Owner-approved trial ceiling: **$5 cumulative maximum and at most 100 inference requests**. Only Haiku 5.5 is selected. No credit purchase or auto-top-up is implied. The owner funded $5 after the initial zero-credit preflight. Post-trial read-only metadata confirms the unchanged $5 lifetime key limit with no reset, usage of $0.0096023 and $4.9903977 remaining. Credentials remain private. See [safe setup and shutdown guide](AI_OPERATIONS.md).

Evaluation used an initial 12-case Haiku-only batch, a controlled repeat after prompt corrections and one complete-date positive case (25 inference calls). There is no automatic retry. Re-running a batch explicitly consumes fresh reservations. The local trial ledger reserves $0.05 before each call, keeps uncertain attempts reserved, and never resets automatically. An exclusive process lock serialises local batches; the provider key cap is an independent backstop. This file-based trial ledger is local-only, not the durable multi-instance application ledger required in milestone 6.

Record actual model/provider, schema-validity and truncation/refusal outcome, category, complaint recall, supported/missing extracted fields, clarification quality, invented facts/prices, full-request latency and charged usage/cost. Keep latency for these small runs descriptive; 13 cases are not an uptime or production p95 study. Preserve safe synthetic sample outputs for review.

Minimum gate: every accepted response passes the domain schema; all complaint examples retain GM attention; no accepted output invents a missing year or a monetary offer; adversarial message instructions do not override application rules. Ambiguous examples may correctly become Unsorted/manual review. Report failures as failures. JSON-schema compliance does not prove semantic correctness.

Outage, malformed/truncated output, duplicate analysis and staff-edit protection require deterministic local tests in milestone 6, rather than spending on deliberately bad provider calls. Then present measured results, sample outputs, limitations and the proposed final configuration for owner approval. No paid integration starts before that decision.

## Provisional reliability and privacy policy

- Prefer explicit paid model IDs and standard service tiers. Avoid free pools, preview fallbacks, broad automatic model selection and capacity-sensitive Flex tiers for the initial configuration.
- Selected primary: Haiku 5.5. Allow eligible same-model provider fallback under the same privacy and price caps. No cross-model fallback is approved; if providers fail, leave the enquiry for manual handling.
- Require native strict JSON-schema output and supported parameters, plus server-side Zod/domain validation. Leave unsupported, refused, truncated or malformed results for manual review.
- Keep `data_collection: deny`. This is not a zero-retention guarantee. Verify account logging and every eligible endpoint's training/retention policy. Consider `zdr: true` only after verifying compatible endpoints and explicitly reviewing the resulting availability tradeoff. No silent privacy relaxation to recover capacity.
- Send only the text and necessary context, not contact email/phone or database identifiers as prompt content. If a guest embeds personal details in the message, sanitisation/minimisation needs explicit handling in milestone 6.
- Trial timeout: 30 seconds per routed HTTP request, no application retry loop. Permit eligible provider/model failover inside that window, otherwise preserve the enquiry and return a safe manual-review outcome. All candidates must support the same schema and privacy constraints.
- Proposed limits: existing 4,000-character enquiry message, a conservative 4,000-token total input budget including instructions/schema, and 1,500 output tokens including reasoning. Measure truncation before finalising. The live trial used 1,500 tokens without truncation; the original application transport still has its legacy 600-token/free configuration until milestone 6.
- Proposed ongoing limits: 100 outbound AI API requests and $1 of reserved/charged inference per database-clock UTC day, whichever is exhausted first. Reserve before calling with transactional locks; include in-flight and uncertain charges, persist attribution and reconcile actual usage. A provider/key-level limit supplements the application reservation. Exact reservation calculations and provider-side enforcement must be validated before claiming a hard monetary ceiling.
- Recheck provider prices against explicit caps before routing. The Haiku-only trial pins caps at $0.10 input / $0.50 output per million tokens and disables reasoning. A cap is a routing filter, not a daily budget.

OpenRouter is still a shared dependency for all these routes. Paid access plus fallbacks improves recovery options; it is not an SLA. A separately provisioned direct-provider escape route is not included in this milestone.

Sources: [provider routing and caps](https://openrouter.ai/docs/guides/routing/provider-selection), [model failover](https://openrouter.ai/docs/guides/routing/model-fallbacks), [strict schema output](https://openrouter.ai/docs/guides/features/structured-outputs), [provider logging policies](https://openrouter.ai/docs/guides/privacy/provider-logging), [credit/rate-limit behaviour](https://openrouter.ai/docs/api_reference/limits), [credit-purchase fees and plan limits](https://openrouter.ai/pricing).

## Required changes after approval

The running application still uses its approved free setup. The trial added a separate evaluator; the application transport, environment values and hosted configuration are unchanged.

1. Replace the `:free`-only check in `src/lib/openrouter.ts` with the approved explicit allowlist and configured paid opt-in; preserve fail-closed behaviour for unapproved models.
2. Replace the zero `provider.max_price` values with approved non-zero caps. Keep `require_parameters` and the approved privacy policy. Set an explicit approved fallback order.
3. Replace `json_object` mode with the tested strict JSON schema, preserve refusal/truncation handling, and update the timeout/output bounds based on evaluation.
4. Add durable usage reservation/accounting and processing locks before staff-triggered provider calls. Persist model/provider attribution and safe outcomes, not raw upstream errors or contact-bearing logs.
5. Keep staff corrections and saved drafts safe on re-analysis; require explicit replacement. Retain the manual workflow regardless of model availability.
6. Update the operator-only `scripts/check-openrouter.ts`, transport tests, `.env.example` variable documentation and `docs/OPENROUTER.md`. Do not turn a routine check into an unannounced paid batch.
7. Resolve paid funding and any new/restricted key through the owner's explicit decision. Existing credentials remain ignored and private. Do not deploy model configuration before the later release gate.

Implemented for the standalone trial: dry-run by default, explicit --run, durable local reservations, $5/100-request maximum, single-process lock, strict schema and price caps, 30-second abort, no automatic retries, persistent local stop/resume/status commands and sanitised failures. Tests cover stop/budget/malformed output and provider failures. Actual paid evaluation is complete; see the decision and result documents. Application analysis and database-backed runtime controls remain milestone 6 work; final measured model/configuration review is owner-approved. Milestone 5 is complete.

Public endpoint metadata was also checked without credentials or inference. Several Haiku endpoints advertise reasoning and response-format support at the pinned short-context rate; higher-priced regional variants are excluded by the caps. Successful trial responses used Anthropic, Google and Azure with the privacy/parameter filters applied; this does not establish zero retention or prove live outage recovery.
