import { getDatabase } from "@/db/client";
import { saveWebsiteEnquiry } from "@/lib/enquiries";
import { bookingBody, bookingJson } from "@/lib/booking-http";
import { BookingError } from "@/lib/booking";

export async function POST(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    const input = await bookingBody(request);
    const connection = getDatabase();
    close = connection.close;
    const result = await saveWebsiteEnquiry(connection.db, input);
    return bookingJson(
      { reference: result.reference },
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof BookingError)
      return bookingJson(
        { error: error.message, code: error.code },
        error.status,
      );
    return bookingJson(
      {
        error:
          "We could not confirm whether your enquiry was saved. Retry the same enquiry shortly.",
        code: "SERVICE_UNAVAILABLE",
      },
      503,
    );
  } finally {
    await close?.().catch(() => {});
  }
}
