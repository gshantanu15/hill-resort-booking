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
