import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { bookingBody, bookingJson } from "@/lib/booking-http";
import { staffEnquiryFailure } from "@/lib/staff-enquiry-http";
import { analyseEnquiry } from "@/lib/enquiry-analysis";

export const maxDuration = 60;
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
    const input = await bookingBody(request);
    const { id } = await context.params;
    const connection = getDatabase();
    close = connection.close;
    return bookingJson({
      enquiry: await analyseEnquiry(connection.db, id, input),
    });
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}
