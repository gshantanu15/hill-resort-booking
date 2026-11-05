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
