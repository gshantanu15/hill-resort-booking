import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireStaff, StaffAuthError } from "@/lib/auth";
import EnquiryInbox from "./enquiry-inbox";
import "../calendar.css";
import "./enquiries.css";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffEnquiriesPage() {
  try {
    await requireStaff(await headers());
  } catch (error) {
    if (error instanceof StaffAuthError) redirect("/staff/login");
    throw error;
  }
  return <EnquiryInbox />;
}
