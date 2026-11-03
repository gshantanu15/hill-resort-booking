import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireStaff, StaffAuthError } from "@/lib/auth";
import CalendarEditor from "./calendar-editor";
import { FIRST_STAY_DATE, resortToday } from "@/lib/booking-validation";
import { addStayDays, inventoryRange } from "@/lib/staff-calendar";
import "./staff.css";
import "./calendar.css";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireStaff(await headers());
  } catch (error) {
    if (error instanceof StaffAuthError) redirect("/staff/login");
    throw error;
  }
  const query = await searchParams;
  let initialRange = {
    start: FIRST_STAY_DATE,
    end: addStayDays(FIRST_STAY_DATE, 6),
  };
  if (typeof query.from === "string" && typeof query.to === "string") {
    try {
      inventoryRange({ start: query.from, end: query.to });
      initialRange = { start: query.from, end: query.to };
    } catch {
      /* Invalid URL filters fall back to the original configured week. */
    }
  }
  return (
    <CalendarEditor
      initialRange={initialRange}
      today={resortToday()}
      initialRoom={typeof query.room === "string" ? query.room : "all"}
    />
  );
}
