import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { enquiryInputSchema } from "../src/lib/enquiry-validation";

const valid = () => ({
  submissionId: randomUUID(),
  contact: { name: "Synthetic Guest", email: "guest@example.test" },
  message: "Could you tell me about availability?",
});

describe("enquiry input validation", () => {
  it("accepts a valid enquiry and trims user text", () => {
    const parsed = enquiryInputSchema.parse({
      ...valid(),
      contact: { name: "  Synthetic Guest ", email: "GUEST@example.test" },
      message: "  Please share room details.  ",
    });
    expect(parsed.contact.name).toBe("Synthetic Guest");
    expect(parsed.contact.email).toBe("guest@example.test");
    expect(parsed.message).toBe("Please share room details.");
  });

  it("requires a UUID, contact and nonblank bounded message", () => {
    expect(
      enquiryInputSchema.safeParse({ ...valid(), submissionId: "bad" }).success,
    ).toBe(false);
    expect(
      enquiryInputSchema.safeParse({ ...valid(), message: "   " }).success,
    ).toBe(false);
    expect(
      enquiryInputSchema.safeParse({ ...valid(), message: "x".repeat(4001) })
        .success,
    ).toBe(false);
    expect(
      enquiryInputSchema.safeParse({
        ...valid(),
        contact: { name: "", email: "bad" },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields so source and routing cannot be client supplied", () => {
    expect(
      enquiryInputSchema.safeParse({ ...valid(), source: "email" }).success,
    ).toBe(false);
    expect(
      enquiryInputSchema.safeParse({ ...valid(), category: "complaint" })
        .success,
    ).toBe(false);
  });
});
