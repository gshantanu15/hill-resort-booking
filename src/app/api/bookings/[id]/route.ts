import { getDatabase } from "@/db/client";
import { getConfirmation } from "@/lib/booking";
import { bookingFailure, bookingJson } from "@/lib/booking-http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let close: (() => Promise<void>) | undefined;
  try {
    const { id } = await context.params;
    const connection = getDatabase();
    close = connection.close;
    return bookingJson(await getConfirmation(connection.db, id));
  } catch (error) {
    return bookingFailure(error);
  } finally {
    await close?.();
  }
}
