import "server-only";
import { z } from "zod";

export const defaultOpenRouterModel = "google/gemma-4-26b-a4b-it:free";
export const defaultOpenRouterFallbackModel =
  "dots-studio/dots-3-note-preview:free";

export class OpenRouterError extends Error {
  constructor(
    public readonly code:
      "configuration" | "rate_limit" | "unavailable" | "invalid_output",
    public readonly retryAfter: string | null = null,
    public readonly limitSource:
      "upstream_provider_shared_pool" | "unknown" | null = null,
  ) {
    super(`OpenRouter: ${code}. Keep the enquiry available for manual review.`);
    this.name = "OpenRouterError";
  }
}

const envelope = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string(),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

/** Server-only transport; callers validate returned data against their domain schema. */
export async function requestStructuredOutput(input: {
  system: string;
  message: string;
  schema: Record<string, unknown>;
}): Promise<{ data: unknown; model: string }> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || defaultOpenRouterModel;
  const fallback = (
    process.env.OPENROUTER_FALLBACK_MODEL ?? defaultOpenRouterFallbackModel
  ).trim();
  const models = [...new Set([model, fallback].filter(Boolean))];
  if (!key || models.some((id) => !id.endsWith(":free")))
    throw new OpenRouterError("configuration");
  if (
    !input.message.trim() ||
    input.message.length > 8000 ||
    input.system.length > 8000
  ) {
    throw new OpenRouterError("configuration");
  }
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hill-resort-booking.vercel.app",
          "X-OpenRouter-Title": "Hill Resort Booking Demo",
        },
        body: JSON.stringify({
          ...(models.length > 1 ? { models } : { model }),
          messages: [
            {
              role: "system",
              content: `${input.system}\nReturn a JSON object matching this schema: ${JSON.stringify(input.schema)}`,
            },
            { role: "user", content: input.message },
          ],
          stream: false,
          max_tokens: 600,
          provider: {
            require_parameters: true,
            data_collection: "deny",
            max_price: { prompt: 0, completion: 0 },
          },
          // shortcut: this free endpoint supports JSON mode, not native strict schemas; callers must validate with Zod.
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(45000),
        cache: "no-store",
      },
    );
    if (response.status === 429) {
      const detail = z
        .object({
          error: z.object({
            metadata: z
              .object({ limit_source: z.string().optional() })
              .optional(),
          }),
        })
        .safeParse(await response.json().catch(() => null));
      throw new OpenRouterError(
        "rate_limit",
        response.headers.get("retry-after"),
        detail.success &&
          detail.data.error.metadata?.limit_source ===
            "upstream_provider_shared_pool"
          ? "upstream_provider_shared_pool"
          : "unknown",
      );
    }
    if (!response.ok) throw new OpenRouterError("unavailable");
    const parsed = envelope.safeParse(await response.json());
    if (!parsed.success || parsed.data.choices[0].finish_reason !== "stop")
      throw new OpenRouterError("invalid_output");
    try {
      return {
        data: JSON.parse(parsed.data.choices[0].message.content),
        model: parsed.data.model ?? model,
      };
    } catch {
      throw new OpenRouterError("invalid_output");
    }
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    throw new OpenRouterError("unavailable");
  }
}
