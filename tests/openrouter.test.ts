import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { OpenRouterError, requestEnquiryOutput } from "../src/lib/openrouter";
const output = {
  category: "room",
  dates: { checkIn: null, checkOut: null, raw: null, yearMissing: false },
  guests: { adults: null, children: null, min: null, max: null },
  budget: { min: null, max: null, currency: null, raw: null },
  uncertainties: [],
  draft: "Please confirm your dates.",
};
beforeEach(() => {
  vi.stubEnv("AI_INFERENCE_ENABLED", "true");
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("OpenRouter enquiry transport", () => {
  it("does not fetch when inference is disabled", async () => {
    vi.stubEnv("AI_INFERENCE_ENABLED", "false");
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(
      requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
    ).rejects.toMatchObject({ code: "disabled" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires the pinned model before fetching", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("OPENROUTER_ENQUIRY_MODEL", "free/model");
    await expect(
      requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
    ).rejects.toMatchObject({ code: "configuration" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends bounded strict-schema requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "anthropic/claude-haiku-5.5",
          provider: "anthropic",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(output) },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    await requestEnquiryOutput({
      message: "room",
      referenceDate: "2026-11-05",
    });
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: "anthropic/claude-haiku-5.5",
      max_tokens: 1500,
      reasoning: { enabled: false },
      provider: {
        require_parameters: true,
        data_collection: "deny",
        max_price: { prompt: 0.1, completion: 0.5 },
      },
      response_format: { json_schema: { strict: true } },
    });
  });
  it("maps provider failures and validates a successful envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "anthropic/claude-haiku-5.5",
          provider: "anthropic",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(output) },
            },
          ],
          usage: { cost: 0.01 },
        }),
        { status: 200 },
      ),
    );
    await expect(
      requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
    ).resolves.toMatchObject({
      model: "anthropic/claude-haiku-5.5",
      costUsd: 0.01,
    });
    for (const status of [401, 403, 402, 429, 503]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("", { status }),
      );
      await expect(
        requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
      ).rejects.toBeInstanceOf(OpenRouterError);
    }
  });
  it("maps network and timeout failures without raw errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("SECRET RAW"));
    await expect(
      requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
    ).rejects.toMatchObject({ code: "unavailable" });
    await expect(
      requestEnquiryOutput({
        message: "room",
        referenceDate: "2026-11-05",
        signal: AbortSignal.abort(new DOMException("deadline", "TimeoutError")),
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });
  it.each([
    ["{bad", "invalid_output"],
    [
      {
        model: "other/model",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
      },
      "configuration",
    ],
    [
      {
        model: "anthropic/claude-haiku-5.5",
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify(output) },
          },
        ],
      },
      "invalid_output",
    ],
    [
      {
        model: "anthropic/claude-haiku-5.5",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(output) },
          },
        ],
        usage: { cost: -1 },
      },
      "invalid_output",
    ],
  ] as const)("rejects unsafe provider envelopes", async (body, code) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status: 200,
      }),
    );
    await expect(
      requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
    ).rejects.toMatchObject({ code });
  });
  it("rejects semantic output errors", async () => {
    for (const bad of [
      { ...output, draft: "Your booking is confirmed at INR 5000." },
      {
        ...output,
        dates: { ...output.dates, checkIn: "2027-02-10", yearMissing: true },
      },
    ]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "anthropic/claude-haiku-5.5",
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify(bad) },
              },
            ],
          }),
          { status: 200 },
        ),
      );
      await expect(
        requestEnquiryOutput({ message: "room", referenceDate: "2026-11-05" }),
      ).rejects.toMatchObject({ code: "invalid_output" });
    }
  });
});
