import "server-only";
import { StaffAuthError } from "./auth";
import { BookingError } from "./booking";
import { bookingJson } from "./booking-http";

export function staffEnquiryFailure(error: unknown) {
  if (error instanceof StaffAuthError || error instanceof BookingError)
    return bookingJson(
      {
        error: error.message,
        code:
          error instanceof BookingError ? error.code : "STAFF_ACCESS_REQUIRED",
      },
      error.status,
    );
  return bookingJson(
    {
      error: "Enquiry service unavailable. Please try again shortly.",
      code: "SERVICE_UNAVAILABLE",
    },
    503,
  );
}
