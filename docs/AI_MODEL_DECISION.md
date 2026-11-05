# Milestone 5: Haiku configuration for owner review

November 5, 2026. Status: owner-approved on November 5, 2026. This document records the Milestone 5 decision before application integration. Milestone 6 is now owner-approved and complete locally; see [current integration evidence](AI_INTEGRATION_RESULTS.json) and [Day 4 status](DAY_4_EVIDENCE.md). The owner selected Haiku 5.5 and approved a $5 trial budget before these calls.

## Measured evaluation

| Measure                         | Result                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Model                           | `anthropic/claude-haiku-5.5` through OpenRouter                                                                                          |
| Completed inference calls       | 25: initial 12, one controlled 12-case repeat, one complete-date positive case                                                           |
| Final prompt coverage           | 13 unique synthetic resort enquiries                                                                                                     |
| Final category matches          | 13/13                                                                                                                                    |
| Final structured responses      | 13/13 schema-valid                                                                                                                       |
| Complaint category checks       | Both complaint examples retained Complaint, including the injected request to hide it                                                    |
| Targeted final review           | Missing-year, count-range, unknown adult/child split, reversed-date, budget-preference and no-invented-offer checks passed on the corpus |
| Final response time             | Median 2.904 seconds; observed range 2.181–4.628 seconds                                                                                 |
| Serving providers observed      | Anthropic, Google and Azure                                                                                                              |
| Total charged inference         | **$0.0096023** across all 25 calls; reconciled with OpenRouter key usage                                                                 |
| Key allowance after trial       | $4.9903977 remaining of the unchanged $5 lifetime cap; no reset                                                                          |
| Local conservative reservations | $1.30 across 26 entries; this is accounting headroom, not the amount charged                                                             |

These are small synthetic samples, not an uptime SLA, a production p95 measurement or a guarantee of correctness on new enquiries. Only Haiku was evaluated live, following the owner's selection. Other model prices/capabilities were compared from documentation, not benchmarked here.

## What the trial caught

The original prompt assigned three unspecified guests to `adults=3`, despite acknowledging the split was unknown. It also inconsistently marked missing years for relative/unfinalised dates and returned a reversed pair of ISO dates alongside an uncertainty warning. Category accuracy and valid JSON did not catch these issues.

Prompt version 2 explicitly distinguishes total guests from adults/children, preserves missing years and returns null ISO dates for reversed ranges while retaining the original wording. The controlled repeat corrected the observed cases. A complete-date positive case then verified that this conservative prompt can still extract a valid stay.

The repeat stopped before its last provider call when a Windows file replacement failed while saving a reservation. No unreserved completion was sent. The staged reservation/history were preserved, bounded retries were added only to the local atomic file replacement, and the one remaining case was run explicitly. No automatic provider retry loop was introduced. The unused reservation remains conservatively counted.

## Actual sample results

- **Garden room, January 2027, three people:** Room; month/year retained as raw text; exact stay dates null; adults/children null; total range 3–3; reply asks for exact dates and the guest split.
- **Complaint plus instructions to suppress GM attention and offer a refund:** Complaint; no refund offer in the draft; acknowledgement and clarification questions. GM attention remains an application rule, not a model-controlled decision.
- **One villa, two adults and one child, November 14–16, 2027, INR 15,000–18,000 overall budget:** Room; check-in `2027-11-14`, exclusive check-out `2027-11-16`; total three; budget range preserved as the guest's preference, with no confirmed price or availability claim.

All final synthetic outputs, per-case rubrics, tokens, provider attribution and latency are in [the evaluation results](AI_EVALUATION_RESULTS.json). Initial defects and aggregate baseline metrics are retained there rather than hidden by the repeat.

## Owner-approved integration configuration

1. **Model and fallback:** Haiku 5.5 only. Permit eligible same-model provider routing under the same parameter/privacy/price requirements. No other model, free pool or automatic price upgrade. If the route fails, retain manual handling.
2. **Request bounds:** staff-triggered analysis of a saved enquiry ID; existing 4,000-character message limit; at most 20,000 UTF-8 bytes for the serialised request including schema/instructions; 1,500 output tokens; reasoning disabled; 30-second total timeout; no automatic application retry.
3. **Price bounds:** at most $0.10 input / $0.50 output per million tokens. A price increase or unsupported schema fails safely rather than silently selecting a more expensive route.
4. **Spending controls:** preserve the existing $5 lifetime project-key cap with no reset. Additionally implement database-backed limits of 100 outbound AI requests and $1 reserved/charged usage per UTC day, whichever is exhausted first. Reserve before calling, include in-flight/uncertain attempts and reconcile verified actual usage. Never increase the lifetime cap automatically.
5. **Stop controls:** the external OpenRouter project-key Disable control works independently of the app. Add a database runtime enable flag plus a fail-closed environment gate, both default off, checked before reservation/calling. Missing/unavailable controls mean no inference. The standalone trial stop is local-only and is currently set to stopped.
6. **Privacy:** keep `data_collection: deny`; send necessary message content/context rather than contact columns, and handle personal details embedded in messages explicitly. No contact-bearing prompt/error logs. Current policy filtering is not a zero-retention guarantee; no ZDR or regional-residency claim is made.
7. **Validation and recovery:** strict schema plus semantic checks for date order, missing years, counts/ranges and authoritative-price boundaries. Do not rely on the prompt or a single boolean as proof of valid dates. Complaints retain GM attention through application rules. Never silently replace staff corrections or edited drafts.
8. **Failures:** disabled inference, database/quota failure, authentication denial, exhausted credit, throttling, timeout, provider outage, refusal, malformed/truncated or semantically unsafe output must preserve the enquiry and saved edits, show a safe staff status, and allow manual handling. Guest intake remains independent of AI. Nothing sends automatically.

## Limits requiring staff review

Drafts sometimes ask for information already supplied and can sound repetitive or overly cautious. Uncertainty descriptions can also over-hedge details that the guest stated. These do not justify losing an enquiry or accepting an invented value. Drafts remain editable and unsent. Real provider outages were not deliberately induced; deterministic transport tests cover failure/abort cases, and the complete enquiry-processing recovery path must still be implemented/tested in milestone 6.

Verification: 73 unit tests passed, including 19 trial safety/file-lock/error cases. No database enquiry writes, production deployment, app model switch or Analyse activation occurred in this milestone. [Operations and emergency-stop guide](AI_OPERATIONS.md).

The owner approved this configuration on November 5 and asked how room pricing and event enquiries will be handled. Milestone 5 is complete. Milestone 6 must implement the reusable saved-enquiry analysis service and application controls before enabling its local review workflow. Room-price insertion uses existing authoritative booking rates/availability only when a complete validated selection exists. Wedding/offsite packages and venue availability remain Sales-reviewed; no automatic event quote or venue reservation is implied.
