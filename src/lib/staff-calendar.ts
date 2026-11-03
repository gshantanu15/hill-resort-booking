import { parseDate } from "@internationalized/date";
import { parseRange } from "./staff-inventory";

export type CalendarRange = { start: string; end: string };
export type CalendarRow = {
  roomTypeId: string;
  roomName: string;
  stayDate: string;
  pricePaise: number;
  allotment: number;
  booked: number;
  websiteLimit: number;
  blackout: boolean;
};

export function addStayDays(day: string, count: number) {
  return parseDate(day).add({ days: count }).toString();
}

// The picker includes the last stay night; the existing API excludes its end.
export function inventoryRange(range: CalendarRange) {
  return parseRange(range.start, addStayDays(range.end, 1));
}

export function stayNights(range: CalendarRange) {
  const { start, end } = inventoryRange(range);
  const nights: string[] = [];
  for (let day = start; day < end; day = addStayDays(day, 1)) nights.push(day);
  return nights;
}

export function nightKey(row: Pick<CalendarRow, "roomTypeId" | "stayDate">) {
  return `${row.roomTypeId}:${row.stayDate}`;
}

export function formatStayDate(
  day: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function formatStayRange(range: CalendarRange) {
  if (range.start === range.end)
    return formatStayDate(range.start, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return range.start.slice(0, 7) === range.end.slice(0, 7)
    ? `${Number(range.start.slice(-2))} to ${formatStayDate(range.end, { day: "numeric", month: "short", year: "numeric" })}`
    : `${formatStayDate(range.start, { day: "numeric", month: "short" })} to ${formatStayDate(range.end, { day: "numeric", month: "short", year: "numeric" })}`;
}
