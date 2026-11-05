import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function phoneProblem(value: string): string {
  const text = value.trim();
  if (!text) return "";
  const phone = /^\+[\d\s()-]+$/.test(text)
    ? parsePhoneNumberFromString(text)
    : undefined;
  return phone?.isValid()
    ? ""
    : "Enter a valid phone number with country code, for example +91 98765 43210, or leave it blank.";
}
export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter the booking contact’s name.")
      .max(120),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(254)
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .refine(
        (value) => !phoneProblem(value ?? ""),
        "Enter a valid phone number with country code, or leave it blank.",
      )
      .transform((value) => value || undefined),
  })
  .strict();
