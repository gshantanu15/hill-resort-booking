import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, renameSync } from "node:fs";
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});
import os from "node:os";
import path from "node:path";
import {
  readTrialLedger,
  reserveTrialRequest,
  requestTrialCompletion,
  trialModel,
  trialOutputSchema,
} from "../scripts/ai-trial-safety";

const directories: string[] = [];
const directory = () => {
  const value = mkdtempSync(path.join(os.tmpdir(), "aavana-ai-trial-"));
  directories.push(value);
  return value;
};
afterEach(() => {
  vi.unstubAllGlobals();
  for (const value of directories.splice(0))
    rmSync(value, { recursive: true, force: true });
});
const output = {
  category: "room",
  dates: {
    checkIn: null,
    checkOut: null,
    raw: "14-16 November",
    yearMissing: true,
  },
  guests: { adults: 2, children: 1, min: 3, max: 3 },
  budget: { min: null, max: null, currency: null, raw: null },
  uncertainties: ["Year is missing"],
  draft: "Please confirm the year for your stay.",
};

describe("bounded standalone Haiku trial", () => {
  it("retries transient Windows file locks before confirming a reservation", () => {
    const dir = directory();
    const rename = vi.mocked(renameSync).mockClear();
    rename.mockImplementationOnce(() => {
      throw Object.assign(new Error("locked"), { code: "EPERM" });
    });
    rename.mockImplementationOnce(() => {
      throw Object.assign(new Error("locked"), { code: "EACCES" });
    });
    reserveTrialRequest(dir, readTrialLedger(dir), "windows-lock");
    expect(rename).toHaveBeenCalledTimes(3);
    expect(readTrialLedger(dir).attempts).toHaveLength(1);
  });
  it("stops on a permanent reservation write failure without resetting the ledger", () => {
    const dir = directory();
    const rename = vi.mocked(renameSync).mockClear();
    rename.mockImplementationOnce(() => {
      throw Object.assign(new Error("disk failure"), { code: "EIO" });
    });
    expect(() =>
      reserveTrialRequest(dir, readTrialLedger(dir), "disk-failure"),
    ).toThrow("disk failure");
    expect(rename).toHaveBeenCalledTimes(1);
    expect(readTrialLedger(dir).attempts).toHaveLength(0);
  });
  it("persists reservations across restarts and rejects the 101st call", () => {
    const dir = directory();
    for (let i = 0; i < 100; i++)
      reserveTrialRequest(dir, readTrialLedger(dir), `case-${i}`);
    const saved = readTrialLedger(dir);
    expect(saved.attempts).toHaveLength(100);
    expect(saved.attempts.every((item) => item.outcome === "unconfirmed")).toBe(
      true,
    );
    expect(() => reserveTrialRequest(dir, saved, "over-budget")).toThrow(
      /budget/,
    );
    expect(readTrialLedger(dir).attempts).toHaveLength(100);
  });
  it("fails closed for a stop marker and corrupted ledger", () => {
    const dir = directory();
    writeFileSync(path.join(dir, "disabled"), "stop");
    expect(() =>
      reserveTrialRequest(dir, readTrialLedger(dir), "stopped"),
    ).toThrow(/disabled/);
    writeFileSync(path.join(dir, "ledger.json"), "invalid");
    expect(() => readTrialLedger(dir)).toThrow(/budget/);
  });
  it("cannot start a completion after stop or deadline", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(
      requestTrialCompletion(
        "private-placeholder",
        "Message",
        AbortSignal.abort(),
      ),
    ).rejects.toMatchObject({ code: "disabled" });
    await expect(
      requestTrialCompletion(
        "private-placeholder",
        "Message",
        AbortSignal.abort(new DOMException("deadline", "TimeoutError")),
      ),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(transport).not.toHaveBeenCalled();
  });
  it("pins the approved model, strict output, price/output caps and no reasoning", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "synthetic-generation",
          model: trialModel,
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(output) },
            },
          ],
          usage: {
            prompt_tokens: 1000,
            completion_tokens: 200,
            cost: 0.0002,
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", transport);
    const result = await requestTrialCompletion(
      "private-placeholder",
      "Synthetic enquiry",
      new AbortController().signal,
    );
    expect(result.output.dates.yearMissing).toBe(true);
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.model).toBe(trialModel);
    expect(body.models).toBeUndefined();
    expect(body.max_tokens).toBe(1500);
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.provider).toMatchObject({
      data_collection: "deny",
      require_parameters: true,
      max_price: { prompt: 0.1, completion: 0.5 },
    });
    expect(body.response_format.json_schema.strict).toBe(true);
  });
  it.each([
    [401, "authentication"],
    [403, "authentication"],
    [402, "funding"],
    [429, "rate_limit"],
    [503, "unavailable"],
    [400, "configuration"],
  ])(
    "safely handles HTTP %i without retry or raw error exposure",
    async (status, code) => {
      const transport = vi
        .fn()
        .mockResolvedValue(
          new Response("secret upstream body", { status: Number(status) }),
        );
      vi.stubGlobal("fetch", transport);
      await expect(
        requestTrialCompletion(
          "private-placeholder",
          "Message",
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["malformed", "truncated", "refusal", "wrong-model", "schema-error"])(
    "rejects %s output",
    async (mode) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              id: "synthetic-generation",
              model: mode === "wrong-model" ? "other/model" : trialModel,
              choices: [
                {
                  finish_reason: mode === "truncated" ? "length" : "stop",
                  message: {
                    content:
                      mode === "malformed"
                        ? "not JSON"
                        : mode === "refusal"
                          ? null
                          : JSON.stringify(
                              mode === "schema-error"
                                ? { ...output, category: "invented" }
                                : output,
                            ),
                  },
                },
              ],
            }),
          ),
        ),
      );
      await expect(
        requestTrialCompletion(
          "private-placeholder",
          "Message",
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code: "invalid_output" });
    },
  );
  it("sanitises network failure and aborts a request already in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("sensitive network detail")),
    );
    await expect(
      requestTrialCompletion(
        "private-placeholder",
        "Message",
        new AbortController().signal,
      ),
    ).rejects.toThrow("AI trial: unavailable.");
    const stop = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              stop.signal.addEventListener("abort", () =>
                reject(new Error("sensitive")),
              ),
            ),
        ),
    );
    const pending = requestTrialCompletion(
      "private-placeholder",
      "Message",
      stop.signal,
    );
    stop.abort();
    await expect(pending).rejects.toMatchObject({ code: "disabled" });
  });
  it("rejects extra fields and invalid dates in structured output", () => {
    expect(trialOutputSchema.safeParse({ ...output, send: true }).success).toBe(
      false,
    );
    expect(
      trialOutputSchema.safeParse({
        ...output,
        dates: { ...output.dates, checkIn: "2026-02-31" },
      }).success,
    ).toBe(false);
  });
});
