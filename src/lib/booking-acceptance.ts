import { z } from "zod";
import { BOOKING_TERMS_VERSION, DATA_USE_VERSION } from "./booking-policies";
export const acceptanceSchema = z
  .object({
    termsVersion: z.string().min(1).max(80),
    dataUseVersion: z.string().min(1).max(80),
    termsAccepted: z.literal(true),
    dataUseAccepted: z.literal(true),
  })
  .strict();
export type BookingAcceptance = z.infer<typeof acceptanceSchema>;
export function currentAcceptance(): BookingAcceptance {
  return {
    termsVersion: BOOKING_TERMS_VERSION,
    dataUseVersion: DATA_USE_VERSION,
    termsAccepted: true,
    dataUseAccepted: true,
  };
}
export function isCurrentAcceptance(
  value: unknown,
): value is BookingAcceptance {
  const parsed = acceptanceSchema.safeParse(value);
  return (
    parsed.success &&
    parsed.data.termsVersion === BOOKING_TERMS_VERSION &&
    parsed.data.dataUseVersion === DATA_USE_VERSION
  );
}
