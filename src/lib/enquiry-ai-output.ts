import { z } from "zod";
import { enquiryReferenceDate } from "./enquiry-ai-prompt";
export {
  buildEnquiryAIPrompt,
  enquiryReferenceDate,
} from "./enquiry-ai-prompt";

const count = z.number().int().min(0).max(10000).nullable();
export const enquiryAIOutputSchema = z
  .object({
    category: z.enum(["room", "wedding", "offsite", "complaint", "unsorted"]),
    dates: z
      .object({
        checkIn: z.iso.date().nullable(),
        checkOut: z.iso.date().nullable(),
        raw: z.string().max(1000).nullable(),
        yearMissing: z.boolean(),
      })
      .strict(),
    guests: z
      .object({ adults: count, children: count, min: count, max: count })
      .strict(),
    budget: z
      .object({
        min: z.number().nonnegative().max(1e9).nullable(),
        max: z.number().nonnegative().max(1e9).nullable(),
        currency: z.literal("INR").nullable(),
        raw: z.string().max(1000).nullable(),
      })
      .strict(),
    uncertainties: z.array(z.string().max(500)).max(15),
    draft: z.string().min(1).max(3000),
  })
  .strict();
export type EnquiryAIOutput = z.infer<typeof enquiryAIOutputSchema>;
const money =
  /[₹$€£]|\b(?:INR|USD|Rs\.?|rupees?|lakhs?|crores?|dollars?)\b|\b(?:price|cost|rate|tariff|pay|charge|refund|discount)\b\s*(?:is|of|at|:)?\s*\d/i;
const adultWords = /\b(adults?|adult|grown[- ]?ups?|वयस्क|बड़े)\b/i;
const childWords = /\b(children?|child|kids?|infants?|बच्चे|बच्चों)\b/i;
export function validateEnquiryAIOutput(
  data: unknown,
  originalSanitisedMessage: string,
  referenceDate = enquiryReferenceDate(new Date()),
): EnquiryAIOutput {
  const parsed = enquiryAIOutputSchema.parse(data);
  const event = parsed.category === "wedding" || parsed.category === "offsite";
  let placeholders = 0;
  parsed.draft = parsed.draft
    .replace(/\[Sales-approved quote\]/gi, () =>
      event && placeholders++ === 0 ? "[Sales-approved quote]" : "",
    )
    .trim();
  if (!parsed.draft || /\[\/?Accommodation quote\]/i.test(parsed.draft))
    throw new Error("AI draft contains a reserved quote block.");
  const currentYear = z.iso.date().parse(referenceDate).slice(0, 4);
  const explicitYears =
    originalSanitisedMessage.match(/\b(?:19|20|21)\d{2}\b/g) ?? [];
  const allowedYears = explicitYears.length ? explicitYears : [currentYear];
  for (const date of [parsed.dates.checkIn, parsed.dates.checkOut])
    if (date && !allowedYears.includes(date.slice(0, 4)))
      throw new Error(
        "AI output introduced a year outside the approved current-year policy.",
      );
  if (
    !explicitYears.length &&
    (parsed.dates.checkIn || parsed.dates.checkOut) &&
    !parsed.dates.yearMissing
  )
    throw new Error("AI output lost assumed-year provenance.");
  if (
    !explicitYears.length &&
    parsed.dates.yearMissing &&
    !parsed.uncertainties.some((note) => /assum/i.test(note))
  )
    parsed.uncertainties = [
      `Staff: year ${currentYear} assumed from the resort calendar.`,
      ...parsed.uncertainties,
    ].slice(0, 15);
  if (
    parsed.dates.checkIn &&
    parsed.dates.checkIn < referenceDate &&
    !parsed.uncertainties.some((note) => /past|before/i.test(note))
  )
    parsed.uncertainties = [
      "Staff: these dates are in the past; verify intended timing before quoting.",
      ...parsed.uncertainties,
    ].slice(0, 15);
  if (
    parsed.dates.checkIn &&
    parsed.dates.checkOut &&
    parsed.dates.checkOut <= parsed.dates.checkIn
  )
    throw new Error("AI output contains reversed dates.");
  if (
    parsed.guests.adults !== null &&
    !adultWords.test(originalSanitisedMessage)
  )
    throw new Error("AI output inferred an adult subgroup.");
  if (
    parsed.guests.children !== null &&
    !childWords.test(originalSanitisedMessage)
  )
    throw new Error("AI output inferred a child subgroup.");
  if (
    money.test(parsed.draft) ||
    /\b(?:we have|we\x27ve|i have)\s+(?:booked|reserved|confirmed|refunded|sent)\b|\b(?:booking|reservation|refund|payment)\s+(?:is\s+|has\s+been\s+|was\s+)?(?:confirmed|approved|processed|received|issued|sent)\b/i.test(
      parsed.draft,
    )
  )
    throw new Error("AI draft contains an unauthorised commercial claim.");
  if (
    parsed.guests.min !== null &&
    parsed.guests.max !== null &&
    parsed.guests.min > parsed.guests.max
  )
    throw new Error("AI output reversed guest counts.");
  if (parsed.guests.adults !== null && parsed.guests.children !== null) {
    const total = parsed.guests.adults + parsed.guests.children;
    if (
      (parsed.guests.min !== null && total < parsed.guests.min) ||
      (parsed.guests.max !== null && total > parsed.guests.max)
    )
      throw new Error("AI output has inconsistent guest totals.");
  }
  if (
    parsed.budget.min !== null &&
    parsed.budget.max !== null &&
    parsed.budget.min > parsed.budget.max
  )
    throw new Error("AI output reversed budget range.");
  return parsed;
}
export function redactEnquiryMessage(message: string) {
  return message
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi, "[email]")
    .replace(/\+\d[\d\s().-]{8,}\d|\b\d{10,15}\b/g, "[phone]");
}
export function formatEnquiryDraft(
  draft: string,
  category: EnquiryAIOutput["category"],
) {
  const team =
    category === "complaint"
      ? "General Manager"
      : category === "wedding" || category === "offsite"
        ? "Sales Team"
        : "Reservations Team";
  let text = draft.replace(/\r\n/g, "\n").trim();
  if (!/^Subject:\s*\S/i.test(text))
    text = `Subject: Your ${category === "unsorted" ? "estate" : category} enquiry at Aavana Estate\n\n${text}`;
  if (!/^Subject:[^\n]+\n+\s*(?:Hello|Dear|Hi)\b/i.test(text))
    text = text.replace(/^(Subject:[^\n]+)\n*/, "$1\n\nHello,\n\n");
  const closing =
    /(?:^|\n)(?:Warm regards|Kind regards|Best regards|Regards|Sincerely),?\s*\n/i;
  if (!closing.test(text)) text += `\n\nWarm regards,\n${team}\nAavana Estate`;
  const event = category === "wedding" || category === "offsite";
  let kept = false;
  const closingAt = text.search(closing);
  text = text.replace(/\[Sales-approved quote\]/gi, (match, offset: number) => {
    if (event && !kept && offset < closingAt) {
      kept = true;
      return "[Sales-approved quote]";
    }
    return "";
  });
  if (event && !kept) {
    const at = text.search(closing);
    text = `${text.slice(0, at).trimEnd()}\n\n[Sales-approved quote]\n\n${text.slice(at).trimStart()}`;
  }
  return text.trim();
}
