import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requestStructuredOutput } from "../src/lib/openrouter";
const input = {
  system: "Classify",
  message: "A wedding",
  schema: { type: "object" },
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv("OPENROUTER_API_KEY", "test-placeholder");
  vi.stubEnv("OPENROUTER_MODEL", "google/gemma-4-26b-a4b-it:free");
  vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "");
}
describe("OpenRouter setup transport", () => {
  it("pins the free model, requires structured output, and returns parsed JSON", async () => {
    configure();
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: { content: '{"category":"wedding"}' },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).resolves.toEqual({
      data: { category: "wedding" },
      model: "google/gemma-4-26b-a4b-it:free",
    });
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.model).toBe("google/gemma-4-26b-a4b-it:free");
    expect(body.provider).toEqual({
      require_parameters: true,
      data_collection: "deny",
      max_price: { prompt: 0, completion: 0 },
    });
    expect(body.models).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
  });
  it("routes Gemma first and only the approved free fallback second, retaining model attribution", async () => {
    configure();
    vi.stubEnv(
      "OPENROUTER_FALLBACK_MODEL",
      "dots-studio/dots-3-note-preview:free",
    );
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "dots-studio/dots-3-note-preview:free",
          choices: [
            {
              finish_reason: "stop",
              message: { content: '{"category":"wedding"}' },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).resolves.toMatchObject({
      model: "dots-studio/dots-3-note-preview:free",
    });
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.models).toEqual([
      "google/gemma-4-26b-a4b-it:free",
      "dots-studio/dots-3-note-preview:free",
    ]);
    expect(body.provider.max_price).toEqual({ prompt: 0, completion: 0 });
  });
  it("rejects a paid fallback before making a request", async () => {
    configure();
    vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "paid/model");
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves rate-limit retry hints without automatic retries", async () => {
    configure();
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "60" } }),
      );
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).rejects.toMatchObject({
      code: "rate_limit",
      retryAfter: "60",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("identifies shared provider-pool throttling without exposing raw provider messages", async () => {
    configure();
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            metadata: {
              limit_source: "upstream_provider_shared_pool",
              raw: "sensitive upstream detail",
            },
          },
        }),
        { status: 429 },
      ),
    );
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).rejects.toMatchObject({
      code: "rate_limit",
      limitSource: "upstream_provider_shared_pool",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each(["bad-json", "truncated", "network", "provider-error"])(
    "handles %s as a safe failure",
    async (mode) => {
      configure();
      vi.stubGlobal(
        "fetch",
        mode === "network"
          ? vi.fn().mockRejectedValue(new Error("sensitive upstream details"))
          : vi.fn().mockResolvedValue(
              mode === "provider-error"
                ? new Response("upstream details", { status: 503 })
                : new Response(
                    JSON.stringify({
                      choices: [
                        {
                          finish_reason:
                            mode === "truncated" ? "length" : "stop",
                          message: { content: "bad-json" },
                        },
                      ],
                    }),
                  ),
            ),
      );
      await expect(requestStructuredOutput(input)).rejects.toThrow(
        /Keep the enquiry available for manual review/,
      );
    },
  );
  it("rejects paid model configuration before making a request", async () => {
    configure();
    vi.stubEnv("OPENROUTER_MODEL", "paid/model");
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(transport).not.toHaveBeenCalled();
  });
  it("rejects missing credentials without making a request", async () => {
    configure();
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(requestStructuredOutput(input)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(transport).not.toHaveBeenCalled();
  });
});
