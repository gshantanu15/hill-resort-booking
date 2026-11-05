import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { getStaffEnquiry, updateStaffEnquiry } from "@/lib/enquiries";
import { bookingBody, bookingJson } from "@/lib/booking-http";
import { staffEnquiryFailure } from "@/lib/staff-enquiry-http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let close: (() => Promise<void>) | undefined;
  try {
    await requireStaff(request.headers);
    const { id } = await context.params;
    const connection = getDatabase();
    close = connection.close;
    return bookingJson({ enquiry: await getStaffEnquiry(connection.db, id) });
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}

export async function PATCH(
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
    const { id } = await context.params;
    const input = await bookingBody(request, 65536);
    const connection = getDatabase();
    close = connection.close;
    return bookingJson({
      changes: await updateStaffEnquiry(connection.db, id, input),
    });
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}
