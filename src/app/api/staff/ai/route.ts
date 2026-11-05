import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { bookingJson } from "@/lib/booking-http";
import { staffEnquiryFailure } from "@/lib/staff-enquiry-http";
import { getEnquiryAIStatus } from "@/lib/enquiry-analysis";

export async function GET(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    await requireStaff(request.headers);
    const connection = getDatabase();
    close = connection.close;
    return bookingJson(await getEnquiryAIStatus(connection.db));
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}
