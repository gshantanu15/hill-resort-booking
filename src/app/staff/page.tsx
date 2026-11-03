import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireStaff, StaffAuthError } from "@/lib/auth";
import CalendarEditor from "./calendar-editor";
import "./staff.css";

export default async function StaffPage() {
  try {
    await requireStaff(await headers());
  } catch (error) {
    if (error instanceof StaffAuthError) redirect("/staff/login");
    throw error;
  }
  return (
    <main className="staff-page">
      <div className="staff-panel">
        <div className="staff-heading">
          <div>
            <p className="staff-kicker">Staff workspace</p>
            <h1>Calendar editor</h1>
            <p>
              Edit website rates, allotments and blackouts for configured
              nights.
            </p>
          </div>
        </div>
        <CalendarEditor />
      </div>
    </main>
  );
}
