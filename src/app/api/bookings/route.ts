import { getDatabase } from "@/db/client";
import { confirmBooking } from "@/lib/booking";
import {
  bookingBody,
  bookingFailure,
  bookingJson,
  quoteSecret,
} from "@/lib/booking-http";

export async function POST(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    const input = await bookingBody(request);
    const connection = getDatabase();
    close = connection.close;
    return bookingJson(
      await confirmBooking(connection.db, input, { secret: quoteSecret() }),
    );
  } catch (error) {
    return bookingFailure(error);
  } finally {
    await close?.();
  }
}
