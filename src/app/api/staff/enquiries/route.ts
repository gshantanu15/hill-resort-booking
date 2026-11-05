import { getDatabase } from "@/db/client";
import { requireStaff } from "@/lib/auth";
import { listStaffEnquiries, saveSimulatedEnquiry } from "@/lib/enquiries";
import { bookingBody, bookingJson } from "@/lib/booking-http";
import { staffEnquiryFailure } from "@/lib/staff-enquiry-http";

export async function GET(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    await requireStaff(request.headers);
    const connection = getDatabase();
    close = connection.close;
    return bookingJson(
      await listStaffEnquiries(
        connection.db,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}

export async function POST(request: Request) {
  let close: (() => Promise<void>) | undefined;
  try {
    await requireStaff(request.headers);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return bookingJson(
        { error: "Cross-origin requests are not allowed." },
        403,
      );
    const input = await bookingBody(request);
    const connection = getDatabase();
    close = connection.close;
    const result = await saveSimulatedEnquiry(connection.db, input);
    return bookingJson(
      { reference: result.reference },
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    return staffEnquiryFailure(error);
  } finally {
    await close?.().catch(() => {});
  }
}
