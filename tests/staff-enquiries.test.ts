import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  enquiryListSchema,
  simulatedEnquiryInputSchema,
} from "../src/lib/enquiry-validation";

const contact = {
  name: "Synthetic Staff Test",
  email: "staff-test@example.test",
};

describe("staff enquiry input contracts", () => {
  it("accepts only simulated email or WhatsApp sources", () => {
    expect(
      simulatedEnquiryInputSchema.safeParse({
        submissionId: randomUUID(),
        source: "email",
        contact,
        message: "An email enquiry",
      }).success,
    ).toBe(true);
    expect(
      simulatedEnquiryInputSchema.safeParse({
        submissionId: randomUUID(),
        source: "whatsapp",
        contact,
        message: "A WhatsApp enquiry",
      }).success,
    ).toBe(true);
    expect(
      simulatedEnquiryInputSchema.safeParse({
        submissionId: randomUUID(),
        source: "website",
        contact,
        message: "Client cannot choose source",
      }).success,
    ).toBe(false);
  });

  it("rejects client supplied routing and persistence fields", () => {
    const base = {
      submissionId: randomUUID(),
      source: "email" as const,
      contact,
      message: "A simulated message",
    };
    expect(
      simulatedEnquiryInputSchema.safeParse({ ...base, category: "complaint" })
        .success,
    ).toBe(false);
    expect(
      simulatedEnquiryInputSchema.safeParse({ ...base, owner: "gm" }).success,
    ).toBe(false);
    expect(
      simulatedEnquiryInputSchema.safeParse({
        ...base,
        requestFingerprint: "secret",
      }).success,
    ).toBe(false);
  });

  it("validates staff list filters and pagination", () => {
    expect(
      enquiryListSchema.parse({
        source: "whatsapp",
        category: "complaint",
        owner: "gm",
        attention: "gm",
        review: "needs-review",
        page: "2",
      }),
    ).toEqual({
      source: "whatsapp",
      category: "complaint",
      owner: "gm",
      attention: "gm",
      review: "needs-review",
      page: 2,
    });
    expect(enquiryListSchema.parse({})).toMatchObject({ page: 1 });
    expect(enquiryListSchema.safeParse({ source: "website" }).success).toBe(
      true,
    );
    expect(enquiryListSchema.safeParse({ source: "unknown" }).success).toBe(
      false,
    );
    expect(enquiryListSchema.safeParse({ review: "all" }).success).toBe(false);
    expect(enquiryListSchema.safeParse({ attention: "all" }).success).toBe(
      false,
    );
    expect(enquiryListSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(enquiryListSchema.safeParse({ page: "abc" }).success).toBe(false);
  });
});
