import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { BookingError } from "./booking";
import { getStaffEnquiry } from "./enquiries";
import {
  defaultEnquiryOwner,
  enquiryCategorySchema,
} from "./enquiry-validation";
import { OpenRouterError, requestEnquiryOutput } from "./openrouter";
import {
  redactEnquiryMessage,
  validateEnquiryAIOutput,
  enquiryReferenceDate,
  formatEnquiryDraft,
} from "./enquiry-ai-output";

type Database = Pick<PostgresJsDatabase<typeof schema>, "transaction">;
const controlId = "enquiry-ai";
const reservationMicro = 50000;
export const analysisInputSchema = z
  .object({
    replaceRouting: z.boolean().default(false),
    replaceDraft: z.boolean().default(false),
  })
  .strict();

async function clockAndUsage(
  tx: Parameters<
    Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
  >[0],
) {
  const [clock] = await tx.execute<{ now: string }>(
    sql`select clock_timestamp()::text as now`,
  );
  const [usage] = await tx.execute<{
    requests: number;
    daily: number;
    lifetime: number;
  }>(sql`
    select count(*) filter (where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')::int as requests,
    coalesce(sum(coalesce(charged_micro,reserved_micro)) filter (where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'),0)::int as daily,
    coalesce(sum(coalesce(charged_micro,reserved_micro)),0)::int as lifetime from enquiry_ai_usage`);
  return { now: new Date(clock.now), usage };
}
export async function getEnquiryAIStatus(db: Database) {
  return db.transaction(
    async (tx) => {
      const [control] = await tx
        .select()
        .from(schema.aiControls)
        .where(eq(schema.aiControls.id, controlId));
      const { usage } = await clockAndUsage(tx);
      const reason =
        process.env.AI_INFERENCE_ENABLED !== "true" || !control?.enabled
          ? "AI is paused. Manual routing and drafts remain available."
          : !process.env.OPENROUTER_API_KEY?.trim()
            ? "AI configuration is unavailable."
            : usage.requests >= control.dailyRequestLimit ||
                usage.daily + reservationMicro > control.dailyBudgetMicro ||
                usage.lifetime + reservationMicro > control.lifetimeBudgetMicro
              ? "AI usage limit reached. Manual handling remains available."
              : null;
      return {
        enabled: reason === null,
        reason,
        requestsUsed: usage.requests,
        dailyRequestLimit: control?.dailyRequestLimit ?? 100,
        dailyReservedUsd: usage.daily / 1e6,
        dailyBudgetUsd: (control?.dailyBudgetMicro ?? 1000000) / 1e6,
      };
    },
    { accessMode: "read only" },
  );
}

export async function analyseEnquiry(
  db: Database,
  id: string,
  raw: unknown,
  request = requestEnquiryOutput,
) {
  if (!z.uuid().safeParse(id).success)
    throw new BookingError(
      "INVALID_REFERENCE",
      "Choose a valid enquiry reference.",
    );
  const parsed = analysisInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_ANALYSIS",
      "Choose valid analysis options.",
    );
  const token = randomUUID();
  const start = await db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local statement_timeout = '10s'`);
    const [control] = await tx
      .select()
      .from(schema.aiControls)
      .where(eq(schema.aiControls.id, controlId))
      .for("update");
    const [enquiry] = await tx
      .select()
      .from(schema.enquiries)
      .where(eq(schema.enquiries.id, id))
      .for("update");
    if (!enquiry)
      throw new BookingError(
        "ENQUIRY_NOT_FOUND",
        "This enquiry could not be found.",
        404,
      );
    const { now, usage } = await clockAndUsage(tx);
    if (
      enquiry.processingState === "processing" &&
      enquiry.analysisStartedAt &&
      now.getTime() - enquiry.analysisStartedAt.getTime() < 120000
    )
      throw new BookingError(
        "ANALYSIS_IN_PROGRESS",
        "This enquiry is already being analysed. Refresh shortly.",
        409,
      );
    const blocked =
      process.env.AI_INFERENCE_ENABLED !== "true" || !control?.enabled
        ? "disabled"
        : !process.env.OPENROUTER_API_KEY?.trim()
          ? "configuration"
          : usage.requests >= control.dailyRequestLimit ||
              usage.daily + reservationMicro > control.dailyBudgetMicro ||
              usage.lifetime + reservationMicro > control.lifetimeBudgetMicro
            ? "budget"
            : null;
    if (blocked) {
      await tx
        .update(schema.enquiries)
        .set({
          processingState: "failed",
          analysisFailure: blocked,
          needsReview: true,
          analysisToken: null,
          analysisStartedAt: null,
        })
        .where(eq(schema.enquiries.id, id));
      return { blocked, enquiry, now };
    }
    await tx.insert(schema.aiUsage).values({
      id: token,
      enquiryId: id,
      createdAt: now,
      reservedMicro: reservationMicro,
      model: "anthropic/claude-haiku-5.5",
    });
    await tx
      .update(schema.enquiries)
      .set({
        processingState: "processing",
        analysisToken: token,
        analysisStartedAt: now,
        analysisFailure: null,
      })
      .where(eq(schema.enquiries.id, id));
    return { blocked: null, enquiry, now };
  });
  if (start.blocked)
    throw new BookingError(
      `AI_${start.blocked.toUpperCase()}`,
      start.blocked === "budget"
        ? "AI usage limit reached. Please handle this enquiry manually."
        : "AI is paused or unavailable. Your enquiry and saved edits are safe.",
      503,
    );

  const stop = new AbortController();
  let checking = false;
  const checkEnabled = async () => {
    if (process.env.AI_INFERENCE_ENABLED !== "true") {
      stop.abort();
      return false;
    }
    const enabled = await db.transaction(
      async (tx) => {
        const [row] = await tx
          .select({ enabled: schema.aiControls.enabled })
          .from(schema.aiControls)
          .where(eq(schema.aiControls.id, controlId));
        return row?.enabled === true;
      },
      { accessMode: "read only" },
    );
    if (!enabled) stop.abort();
    return enabled;
  };
  const monitor = setInterval(() => {
    if (checking || stop.signal.aborted) return;
    checking = true;
    checkEnabled()
      .catch(() => stop.abort())
      .finally(() => {
        checking = false;
      });
  }, 1000);
  try {
    if (!(await checkEnabled())) throw new OpenRouterError("disabled");
    const message = redactEnquiryMessage(start.enquiry.message);
    const referenceDate = enquiryReferenceDate(start.now);
    const rooms = await db.transaction(
      (tx) =>
        tx
          .select({
            id: schema.roomTypes.id,
            name: schema.roomTypes.name,
            capacity: schema.roomTypes.capacity,
          })
          .from(schema.roomTypes),
      { accessMode: "read only" },
    );
    if (!rooms.length) throw new OpenRouterError("configuration");
    if (!(await checkEnabled())) throw new OpenRouterError("disabled");
    const result = await request({
      message,
      referenceDate,
      rooms,
      signal: stop.signal,
    });
    let data;
    try {
      data = validateEnquiryAIOutput(result.data, message, referenceDate);
    } catch {
      throw new OpenRouterError("safe_output");
    }
    if (!(await checkEnabled())) throw new OpenRouterError("disabled");
    await db.transaction(async (tx) => {
      const [control] = await tx
        .select()
        .from(schema.aiControls)
        .where(eq(schema.aiControls.id, controlId))
        .for("update");
      if (!control?.enabled || process.env.AI_INFERENCE_ENABLED !== "true")
        throw new OpenRouterError("disabled");
      const [current] = await tx
        .select()
        .from(schema.enquiries)
        .where(eq(schema.enquiries.id, id))
        .for("update");
      const cost =
        result.costUsd === null ? null : Math.ceil(result.costUsd * 1e6);
      await tx
        .update(schema.aiUsage)
        .set({
          outcome:
            cost !== null && cost > reservationMicro ? "cost_limit" : "success",
          chargedMicro: cost,
          model: result.model,
          provider: result.provider,
        })
        .where(eq(schema.aiUsage.id, token));
      if (!current || current.analysisToken !== token) return;
      const replaceRoute =
        current.routeRevision === start.enquiry.routeRevision &&
        (!current.routeEdited || parsed.data.replaceRouting);
      const replaceDraft =
        current.draftRevision === start.enquiry.draftRevision &&
        (!current.draftEdited || parsed.data.replaceDraft);
      const category = replaceRoute
        ? data.category
        : enquiryCategorySchema.parse(current.category);
      const complaintAttention =
        category === "complaint" ||
        data.category === "complaint" ||
        category === "unsorted";
      await tx
        .update(schema.enquiries)
        .set({
          extracted: data,
          analysedAt: sql`clock_timestamp()`,
          analysisModel: result.model,
          analysisProvider: result.provider,
          processingState:
            cost !== null && cost > reservationMicro ? "failed" : "processed",
          analysisFailure:
            cost !== null && cost > reservationMicro ? "cost_limit" : null,
          needsReview: true,
          gmAttention:
            complaintAttention ||
            (current.gmAttention && current.category === "complaint"),
          ...(replaceRoute
            ? {
                category: data.category,
                owner: defaultEnquiryOwner(data.category),
                routeEdited: false,
                routeRevision: sql`${schema.enquiries.routeRevision} + 1`,
              }
            : {}),
          ...(replaceDraft && !(cost !== null && cost > reservationMicro)
            ? {
                draft: formatEnquiryDraft(data.draft, category),
                draftEdited: false,
                draftRevision: sql`${schema.enquiries.draftRevision} + 1`,
                pricing: null,
              }
            : {}),
        })
        .where(eq(schema.enquiries.id, id));
      if (cost !== null && cost > reservationMicro)
        await tx
          .update(schema.aiControls)
          .set({ enabled: false })
          .where(eq(schema.aiControls.id, controlId));
    });
  } catch (error) {
    const code = error instanceof OpenRouterError ? error.code : "unavailable";
    await db
      .transaction(async (tx) => {
        if (["authentication", "funding", "configuration"].includes(code))
          await tx
            .update(schema.aiControls)
            .set({ enabled: false })
            .where(eq(schema.aiControls.id, controlId));
        await tx
          .update(schema.aiUsage)
          .set({ outcome: code })
          .where(eq(schema.aiUsage.id, token));
        await tx
          .update(schema.enquiries)
          .set({
            processingState: "failed",
            analysisFailure: code,
            needsReview: true,
          })
          .where(
            sql`${schema.enquiries.id} = ${id} AND ${schema.enquiries.analysisToken} = ${token}`,
          );
      })
      .catch(() => {
        /* A stale processing lease remains recoverable after two minutes. */
      });
    throw new BookingError(
      `AI_${code.toUpperCase()}`,
      "AI assistance could not be completed. Your enquiry and saved edits are safe; you can handle it manually.",
      503,
    );
  } finally {
    clearInterval(monitor);
  }
  return getStaffEnquiry(db, id);
}
