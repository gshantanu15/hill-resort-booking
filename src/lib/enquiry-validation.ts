import { z } from "zod";
import { contactSchema } from "./booking-contact";

export const enquiryInputSchema = z
  .object({
    submissionId: z.uuid(),
    contact: contactSchema,
    message: z
      .string()
      .trim()
      .min(1, "Tell us how we can help.")
      .max(4000, "Keep your message within 4,000 characters."),
  })
  .strict();

export const simulatedEnquiryInputSchema = enquiryInputSchema.extend({
  source: z.enum(["email", "whatsapp"]),
});

export const enquiryCategorySchema = z.enum([
  "room",
  "wedding",
  "offsite",
  "complaint",
  "unsorted",
]);
const enquiryOwnerSchema = z.enum(["reservations", "sales", "gm"]).nullable();
export const enquiryUpdateSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("route"),
      category: enquiryCategorySchema,
      owner: enquiryOwnerSchema.optional(),
      expected: z
        .object({ category: enquiryCategorySchema, owner: enquiryOwnerSchema })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("draft"),
      draft: z.string().max(6000, "Keep the draft within 6,000 characters."),
      expectedDraft: z.string().max(6000),
    })
    .strict(),
]);

export function defaultEnquiryOwner(
  category: z.infer<typeof enquiryCategorySchema>,
) {
  return category === "room"
    ? "reservations"
    : category === "wedding" || category === "offsite"
      ? "sales"
      : "gm";
}

export const enquiryListSchema = z
  .object({
    source: z.enum(["website", "email", "whatsapp"]).optional(),
    category: z
      .enum(["room", "wedding", "offsite", "complaint", "unsorted"])
      .optional(),
    owner: z.enum(["reservations", "sales", "gm", "unassigned"]).optional(),
    review: z.literal("needs-review").optional(),
    attention: z.literal("gm").optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
