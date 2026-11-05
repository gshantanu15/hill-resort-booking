import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { bookingBody, bookingJson, quoteSecret } from "@/lib/booking-http";
import { staffEnquiryFailure } from "@/lib/staff-enquiry-http";
import { insertEnquiryRoomQuote } from "@/lib/enquiry-quote";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let close: (() => Promise<void>) | undefined;
  try {
    await requireStaff(request.headers);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return bookingJson(
        { error: "Cross-origin requests are not allowed." },
        403,
      );
    const input = await bookingBody(request, 65536);
    const { id } = await context.params;
    const connection = getDatabase();
    close = connection.close;
    return bookingJson({
      enquiry: await insertEnquiryRoomQuote(connection.db, id, input, {
        secret: quoteSecret(),
      }),
    });
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}
