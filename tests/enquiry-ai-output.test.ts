import { describe, expect, it } from "vitest";
import candidates from "../docs/AI_REPLY_CANDIDATE_RESULTS.json";
import {
  buildEnquiryAIPrompt,
  enquiryAIOutputSchema,
  redactEnquiryMessage,
  validateEnquiryAIOutput,
  formatEnquiryDraft,
  enquiryReferenceDate,
} from "../src/lib/enquiry-ai-output";
const base = {
  category: "room" as const,
  dates: { checkIn: null, checkOut: null, raw: null, yearMissing: false },
  guests: { adults: null, children: null, min: null, max: null },
  budget: { min: null, max: null, currency: null, raw: null },
  uncertainties: [],
  draft: "Please confirm the dates for your stay.",
};
describe("enquiry AI output safety", () => {
  it("replaces model year assumptions with authoritative resort-year provenance", () => {
    const result = validateEnquiryAIOutput(
      {
        ...base,
        dates: { ...base.dates, raw: "January", yearMissing: true },
        uncertainties: [
          "Year assumed as 2027 because January is next.",
          "Sales must verify venue suitability.",
        ],
      },
      "Team of 45 wants a January offsite",
      "2026-11-05",
    );
    expect(result.uncertainties.join(" ")).toContain("2026 assumed");
    expect(result.uncertainties.join(" ")).not.toContain("2027");
    expect(result.uncertainties.join(" ")).toContain("verify venue");
  });
  it("accepts the approved live reply samples through application validation", () => {
    for (const sample of candidates.cases) {
      const output = validateEnquiryAIOutput(
        sample.output,
        sample.input,
        "2026-11-05",
      );
      const draft = formatEnquiryDraft(output.draft, output.category);
      expect(draft).toMatch(/^Subject:/);
      expect(draft).toContain("Warm regards");
      if (output.category === "offsite" || output.category === "wedding") {
        expect(draft.match(/\[Sales-approved quote\]/g)).toHaveLength(1);
        expect(draft.indexOf("[Sales-approved quote]")).toBeLessThan(
          draft.indexOf("Warm regards"),
        );
      }
    }
  });
  it("validates safe output and preserves prompt rules", () => {
    expect(validateEnquiryAIOutput(base, "I need a room")).toEqual(base);
    const prompt = buildEnquiryAIPrompt("2026-11-05", [
      { id: "estate-villa", name: "Estate villa", capacity: 4 },
    ]);
    expect(prompt).toContain("Prompt version 4");
    expect(prompt).toContain("Sheltered terrace");
    expect(prompt).toContain('"capacity":4');
    expect(prompt).not.toContain("18500");
  });
  it("rejects invented years, reversed dates, subgroup inference and unsafe drafts", () => {
    expect(() =>
      validateEnquiryAIOutput(
        {
          ...base,
          dates: { ...base.dates, checkIn: "2027-02-10", yearMissing: true },
        },
        "stay in February",
        "2026-11-05",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        {
          ...base,
          dates: {
            ...base.dates,
            checkIn: "2027-02-10",
            checkOut: "2027-02-10",
          },
        },
        "10 February 2027",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        {
          ...base,
          dates: {
            ...base.dates,
            checkIn: "2027-02-12",
            checkOut: "2027-02-10",
          },
        },
        "10 to 12 February 2027",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, guests: { ...base.guests, adults: 2 } },
        "2 guests",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, guests: { ...base.guests, adults: 3 } },
        "3 people",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, guests: { ...base.guests, adults: 2, children: 1 } },
        "2 adults",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, guests: { ...base.guests, min: 4, max: 2 } },
        "2 to 4 guests",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        {
          ...base,
          budget: { ...base.budget, min: 18000, max: 15000, currency: "INR" },
        },
        "budget INR 15000-18000",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, draft: "Your booking is confirmed at INR 5000." },
        "room",
      ),
    ).toThrow();
  });
  it("accepts current-year defaults with provenance, honours explicit years and flags past dates", () => {
    const dates = {
      checkIn: "2026-12-13",
      checkOut: "2026-12-17",
      raw: "13-17 December",
      yearMissing: true,
    };
    const result = validateEnquiryAIOutput(
      { ...base, dates },
      "One villa for 3 people, 13-17 December",
      "2026-11-05",
    );
    expect(result.dates).toEqual(dates);
    expect(result.guests.adults).toBeNull();
    expect(result.uncertainties.join(" ")).toContain("2026 assumed");
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, dates: { ...dates, yearMissing: false } },
        "13-17 December",
        "2026-11-05",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, dates },
        "13-17 December 2027",
        "2026-11-05",
      ),
    ).toThrow();
    expect(
      validateEnquiryAIOutput(
        {
          ...base,
          dates: {
            ...dates,
            checkIn: "2027-12-13",
            checkOut: "2027-12-17",
            yearMissing: false,
          },
        },
        "13-17 December 2027",
        "2026-11-05",
      ).dates.checkIn,
    ).toBe("2027-12-13");
    expect(
      validateEnquiryAIOutput(
        {
          ...base,
          dates: { ...dates, checkIn: "2026-01-13", checkOut: "2026-01-17" },
        },
        "13-17 January",
        "2026-11-05",
      ).uncertainties.join(" "),
    ).toContain("past");
    expect(enquiryReferenceDate(new Date("2026-12-31T18:31:00Z"))).toBe(
      "2027-01-01",
    );
  });
  it("formats email and keeps a single event quote slot before the signature", () => {
    const email =
      "Subject: Your offsite\n\nHello,\n\n- Quote: [Sales-approved quote]\n\nWarm regards,\nSales Team\nAavana Estate\n\n[Sales-approved quote]";
    const formatted = formatEnquiryDraft(email, "offsite");
    expect(formatted.match(/\[Sales-approved quote\]/g)).toHaveLength(1);
    expect(formatted).toContain("- Quote: [Sales-approved quote]");
    expect(formatted.indexOf("[Sales-approved quote]")).toBeLessThan(
      formatted.indexOf("Warm regards"),
    );
    expect(formatEnquiryDraft(formatted, "offsite")).toBe(formatted);
    const fallback = formatEnquiryDraft("Our villa includes Wi-Fi.", "room");
    expect(fallback).toMatch(/^Subject:.*\n\nHello,\n\n/);
    expect(fallback).toContain(
      "Warm regards,\nReservations Team\nAavana Estate",
    );
    const appended = formatEnquiryDraft(
      "Subject: Event\n\nHello,\n\nProposal\n\nWarm regards,\nSales Team\nAavana Estate\n\n[Sales-approved quote]",
      "wedding",
    );
    expect(appended.indexOf("[Sales-approved quote]")).toBeLessThan(
      appended.indexOf("Warm regards"),
    );
  });
  it("redacts contact values but preserves dates and budgets", () => {
    const value = redactEnquiryMessage(
      "Email me at guest@example.test, call +91 98765 43210, 10 March 2027, budget INR 15000-18000",
    );
    expect(value).toContain("10 March 2027");
    expect(value).toContain("INR 15000-18000");
    expect(value).not.toContain("guest@example.test");
    expect(value).not.toContain("98765 43210");
  });
  it("keeps the schema strict", () => {
    expect(
      enquiryAIOutputSchema.safeParse({ ...base, extra: true }).success,
    ).toBe(false);
  });
  it("leaves event placeholders to the app and rejects model-owned room quote blocks", () => {
    expect(
      validateEnquiryAIOutput(
        { ...base, draft: "Please confirm dates. [Sales-approved quote]" },
        "Offsite",
      ).draft,
    ).toBe("Please confirm dates.");
    expect(() =>
      validateEnquiryAIOutput(
        {
          ...base,
          draft: "[Accommodation quote] Free room [/Accommodation quote]",
        },
        "Room",
      ),
    ).toThrow();
  });
  it("preserves ISO dates and budget ranges while removing explicit contact data", () => {
    const result = redactEnquiryMessage(
      "2027-01-14 to 2027-01-16, INR 15000-18000; guest@example.test; +91 98765 43210",
    );
    expect(result).toContain("2027-01-14 to 2027-01-16");
    expect(result).toContain("15000-18000");
    expect(result).not.toContain("98765 43210");
    expect(result).not.toContain("guest@example.test");
  });
  it("allows booking clarification but rejects monetary offers and inconsistent ranges", () => {
    expect(
      validateEnquiryAIOutput(
        {
          ...base,
          draft: "Please confirm the dates for your booking enquiry.",
        },
        "Room enquiry",
      ).draft,
    ).toContain("booking enquiry");
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, budget: { ...base.budget, min: 200, max: 100 } },
        "Room enquiry",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, guests: { adults: 2, children: 1, min: 4, max: 4 } },
        "2 adults and 1 child",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, draft: "The price is 500 per night." },
        "Room enquiry",
      ),
    ).toThrow();
    expect(() =>
      validateEnquiryAIOutput(
        { ...base, draft: "Your budget is INR 500." },
        "Budget INR 500",
      ),
    ).toThrow();
  });
});
