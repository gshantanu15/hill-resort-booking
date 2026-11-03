import { getDatabase } from "@/db/client";
import { getAvailability } from "@/lib/booking";
import { bookingFailure, bookingJson } from "@/lib/booking-http";

export async function GET(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const connection = getDatabase();
    close = connection.close;
    return bookingJson(
      await getAvailability(connection.db, {
        checkIn: searchParams.get("checkIn") ?? "",
        checkOut: searchParams.get("checkOut") ?? "",
      }),
    );
  } catch (error) {
    return bookingFailure(error);
  } finally {
    await close?.();
  }
}
