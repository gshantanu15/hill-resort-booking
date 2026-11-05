import "server-only";
import { z } from "zod";
import type { EnquiryPropertyRoom } from "./enquiry-ai-prompt";
import {
  buildEnquiryAIPrompt,
  enquiryAIOutputSchema,
  redactEnquiryMessage,
  validateEnquiryAIOutput,
  type EnquiryAIOutput,
} from "./enquiry-ai-output";
export const defaultOpenRouterModel = "anthropic/claude-haiku-5.5";
export const defaultOpenRouterFallbackModel = defaultOpenRouterModel;
export const enquiryModel = defaultOpenRouterModel;
export class OpenRouterError extends Error {
  constructor(
    public readonly code:
      | "disabled"
      | "configuration"
      | "authentication"
      | "funding"
      | "rate_limit"
      | "timeout"
      | "unavailable"
      | "invalid_output"
      | "safe_output",
  ) {
    super(`OpenRouter: ${code}. Keep the enquiry available for manual review.`);
    this.name = "OpenRouterError";
  }
}
const envelope = z.object({
  model: z.string(),
  provider: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string(),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  usage: z
    .object({ cost: z.number().nonnegative().finite().nullable().optional() })
    .optional(),
});
export async function requestEnquiryOutput(input: {
  message: string;
  referenceDate: string;
  rooms?: EnquiryPropertyRoom[];
  signal?: AbortSignal;
}): Promise<{
  data: EnquiryAIOutput;
  model: string;
  provider: string;
  costUsd: number | null;
}> {
  if (process.env.AI_INFERENCE_ENABLED !== "true")
    throw new OpenRouterError("disabled");
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (
    !key ||
    (process.env.OPENROUTER_ENQUIRY_MODEL &&
      process.env.OPENROUTER_ENQUIRY_MODEL !== enquiryModel)
  )
    throw new OpenRouterError("configuration");
  const message = redactEnquiryMessage(input.message);
  if (!message.trim() || message.length > 4000)
    throw new OpenRouterError("configuration");
  const schema = z.toJSONSchema(enquiryAIOutputSchema);
  delete schema.$schema;
  const body = {
    model: enquiryModel,
    messages: [
      {
        role: "system",
        content: buildEnquiryAIPrompt(input.referenceDate, input.rooms),
      },
      { role: "user", content: message },
    ],
    stream: false,
    reasoning: { enabled: false },
    max_tokens: 1500,
    provider: {
      require_parameters: true,
      data_collection: "deny",
      allow_fallbacks: true,
      max_price: { prompt: 0.1, completion: 0.5 },
    },
    response_format: {
      type: "json_schema",
      json_schema: { name: "resort_enquiry", strict: true, schema },
    },
  };
  const serialized = JSON.stringify(body);
  if (new TextEncoder().encode(serialized).byteLength > 20000)
    throw new OpenRouterError("configuration");
  const timeout = AbortSignal.timeout(30000);
  const signal = input.signal
    ? AbortSignal.any([input.signal, timeout])
    : timeout;
  if (signal.aborted)
    throw new OpenRouterError(
      signal.reason?.name === "TimeoutError" ? "timeout" : "disabled",
    );
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hill-resort-booking.vercel.app",
        "X-OpenRouter-Title": "Hill Resort Booking Demo",
      },
      body: serialized,
      signal,
      cache: "no-store",
    });
  } catch {
    if (signal.aborted)
      throw new OpenRouterError(
        signal.reason?.name === "TimeoutError" ? "timeout" : "disabled",
      );
    throw new OpenRouterError("unavailable");
  }
  if (response.status === 401 || response.status === 403)
    throw new OpenRouterError("authentication");
  if (response.status === 402) throw new OpenRouterError("funding");
  if (response.status === 429) throw new OpenRouterError("rate_limit");
  if (!response.ok)
    throw new OpenRouterError(
      response.status >= 500 ? "unavailable" : "safe_output",
    );
  const parsed = envelope.safeParse(await response.json().catch(() => null));
  if (!parsed.success || parsed.data.choices[0].finish_reason !== "stop")
    throw new OpenRouterError("invalid_output");
  if (
    parsed.data.model &&
    !/^anthropic\/claude-haiku-5[.-]5(?:-|$)/.test(parsed.data.model)
  )
    throw new OpenRouterError("configuration");
  try {
    const data = validateEnquiryAIOutput(
      JSON.parse(parsed.data.choices[0].message.content),
      message,
      input.referenceDate,
    );
    return {
      data,
      model: parsed.data.model ?? enquiryModel,
      provider: parsed.data.provider ?? "unreported",
      costUsd: parsed.data.usage?.cost ?? null,
    };
  } catch {
    throw new OpenRouterError("invalid_output");
  }
}
