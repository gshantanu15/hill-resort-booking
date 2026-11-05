import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { getStaffEnquiry } from "@/lib/enquiries";
import { bookingJson } from "@/lib/booking-http";
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
