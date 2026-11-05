import { config } from "dotenv";
import {
  mkdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  TrialError,
  trialModel,
  trialPromptVersion,
  trialBudgetCents,
  trialRequestLimit,
  trialReservationCents,
  readTrialLedger,
  saveTrialLedger,
  reserveTrialRequest,
  requestTrialCompletion,
} from "./ai-trial-safety";

config({ path: ".env.local", quiet: true });
const directory = path.resolve("private/ai-trial");
const disabled = path.join(directory, "disabled");
const command = process.argv[2] ?? "--dry-run";
const onlyCase = process.argv[3]?.startsWith("--case=")
  ? process.argv[3].slice(7)
  : undefined;

async function main() {
  if (
    !["--dry-run", "--run", "--stop", "--resume", "--status"].includes(
      command,
    ) ||
    process.argv.length > (command === "--run" ? 4 : 3) ||
    (process.argv[3] !== undefined && (!onlyCase || command !== "--run"))
  )
    throw new TrialError("configuration");
  if (command === "--stop" || command === "--resume") {
    mkdirSync(directory, { recursive: true });
    if (command === "--stop")
      writeFileSync(disabled, "Stopped by operator.\n", { flush: true });
    else if (existsSync(disabled)) unlinkSync(disabled);
    console.log(
      command === "--stop"
        ? "Local AI trial stopped. No provider/key settings changed."
        : "Local AI trial resumed. No inference started.",
    );
    return;
  }
  const corpus = z
    .object({
      cases: z
        .array(
          z.object({
            id: z.string(),
            message: z.string().max(4000),
            expectedCategory: z.enum([
              "room",
              "wedding",
              "offsite",
              "complaint",
              "unsorted",
            ]),
            checks: z.array(z.string()),
          }),
        )
        .length(13),
    })
    .parse(JSON.parse(readFileSync("docs/AI_EVALUATION_CASES.json", "utf8")));
  if (onlyCase && !corpus.cases.some((item) => item.id === onlyCase))
    throw new TrialError("configuration");
  const ledger = readTrialLedger(directory);
  console.log(
    JSON.stringify({
      model: trialModel,
      mode: command,
      disabled: existsSync(disabled),
      requestsReserved: ledger.attempts.length,
      reservedUsd: (ledger.attempts.length * trialReservationCents) / 100,
      cumulativeBudgetUsd: trialBudgetCents / 100,
      requestLimit: trialRequestLimit,
      syntheticCases: corpus.cases.length,
    }),
  );
  if (command !== "--run") return;
  if (existsSync(disabled)) throw new TrialError("disabled");
  const key =
    process.env.OPENROUTER_TRIAL_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new TrialError("configuration");
  mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, "running.lock");
  try {
    mkdirSync(lock);
  } catch {
    throw new TrialError("budget");
  }
  try {
    // Reload under the exclusive local lock before any reservation or call.
    const current = readTrialLedger(directory);
    for (const resource of ["key", "credits"]) {
      const response = await fetch(`https://openrouter.ai/api/v1/${resource}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403)
        throw new TrialError("authentication");
      if (!response.ok) throw new TrialError("unavailable");
      const value = await response.json().catch(() => null);
      if (resource === "key") {
        const data = z
          .object({
            limit: z.number().positive().max(5),
            limit_remaining: z.number().min(0.05),
            limit_reset: z.null(),
          })
          .safeParse(value?.data);
        if (!data.success) throw new TrialError("budget");
      } else {
        const data = z
          .object({
            total_credits: z.number().nonnegative(),
            total_usage: z.number().nonnegative(),
          })
          .safeParse(value?.data);
        if (
          !data.success ||
          data.data.total_credits - data.data.total_usage < 0.05
        )
          throw new TrialError("funding");
      }
    }
    for (const item of corpus.cases.filter(
      (item) => !onlyCase || item.id === onlyCase,
    )) {
      reserveTrialRequest(directory, current, item.id);
      const stop = new AbortController();
      const monitor = setInterval(() => {
        if (existsSync(disabled)) stop.abort();
      }, 250);
      const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(30000)]);
      const started = performance.now();
      const attempt = current.attempts[current.attempts.length - 1];
      try {
        if (existsSync(disabled)) stop.abort();
        const result = await requestTrialCompletion(key, item.message, signal);
        const categoryMatches =
          result.output.category === item.expectedCategory;
        attempt.outcome = categoryMatches
          ? "schema_valid_category_match_semantic_review_pending"
          : "category_mismatch";
        if (result.usage?.cost !== undefined)
          attempt.chargedUsd = result.usage.cost;
        const report = {
          caseId: item.id,
          promptVersion: trialPromptVersion,
          latencyMs: Math.round(performance.now() - started),
          categoryMatches,
          semanticReview: "pending",
          rubric: item.checks,
          ...result,
        };
        writeFileSync(
          path.join(
            directory,
            `result-${current.attempts.length}-${item.id}.json`,
          ),
          JSON.stringify(report, null, 2),
          { encoding: "utf8", flush: true },
        );
        saveTrialLedger(directory, current);
        console.log(
          JSON.stringify({
            caseId: item.id,
            outcome: attempt.outcome,
            latencyMs: report.latencyMs,
            chargedUsd: attempt.chargedUsd ?? "unreported",
          }),
        );
        if ((attempt.chargedUsd ?? 0) > trialReservationCents / 100)
          throw new TrialError("budget");
      } catch (error) {
        attempt.outcome =
          error instanceof TrialError ? error.code : "unavailable";
        saveTrialLedger(directory, current);
        throw error;
      } finally {
        clearInterval(monitor);
      }
    }
    console.log(
      "Synthetic batch complete. Semantic review and final configuration approval are still required. No application integration or messages were sent.",
    );
  } finally {
    rmdirSync(lock);
  }
}

main().catch((error) => {
  console.error(
    error instanceof TrialError
      ? error.message
      : "AI trial stopped after a local/configuration/connectivity failure. No automatic retry; credentials and provider details withheld.",
  );
  process.exitCode = 1;
});
