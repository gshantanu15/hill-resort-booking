import { NextResponse } from "next/server";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { nightlyInventory, nightlyRates, roomTypes } from "@/db/schema";
import { requireStaff, StaffAuthError } from "@/lib/auth";
import {
  StaffInputError,
  parseRange,
  validateInventoryPatch,
} from "@/lib/staff-inventory";

async function guard(request: Request) {
  await requireStaff(request.headers);
}

function errorResponse(error: unknown) {
  if (error instanceof StaffAuthError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof StaffInputError)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    await guard(request);
    const url = new URL(request.url);
    const { start, end } = parseRange(
      url.searchParams.get("start"),
      url.searchParams.get("end"),
    );
    const { db, close } = getDatabase();
    try {
      const rows = await db
        .select({
          roomTypeId: roomTypes.id,
          roomName: roomTypes.name,
          stayDate: nightlyInventory.stayDate,
          pricePaise: nightlyRates.pricePaise,
          allotment: nightlyInventory.allotment,
          booked: nightlyInventory.booked,
          websiteLimit: nightlyInventory.websiteLimit,
          blackout: nightlyInventory.blackout,
        })
        .from(nightlyInventory)
        .innerJoin(roomTypes, eq(roomTypes.id, nightlyInventory.roomTypeId))
        .innerJoin(
          nightlyRates,
          and(
            eq(nightlyRates.roomTypeId, nightlyInventory.roomTypeId),
            eq(nightlyRates.stayDate, nightlyInventory.stayDate),
            eq(nightlyRates.ratePlanId, "standard-stay"),
          ),
        )
        .where(
          and(
            gte(nightlyInventory.stayDate, start),
            lt(nightlyInventory.stayDate, end),
          ),
        )
        .orderBy(nightlyInventory.stayDate, roomTypes.id);
      return NextResponse.json(
        { rows },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      await close();
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await guard(request);
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new StaffInputError("Invalid JSON body.");
    }
    const input = validateInventoryPatch(payload);
    const { db, close } = getDatabase();
    try {
      await db.transaction(async (tx) => {
        const inventory = await tx.execute(
          sql`SELECT booked, allotment, website_limit FROM nightly_inventory WHERE room_type_id = ${input.roomTypeId} AND stay_date = ${input.stayDate} FOR UPDATE`,
        );
        const row = inventory[0] as
          | { booked: number; allotment: number; website_limit: number }
          | undefined;
        if (!row)
          throw Object.assign(new Error("Inventory row not found."), {
            code: "MISSING",
          });
        if (row.booked > input.allotment || input.allotment > row.website_limit)
          throw Object.assign(
            new Error("Allotment conflicts with booked or website stock."),
            { code: "CONFLICT" },
          );
        const rate = await tx.execute(
          sql`SELECT room_type_id FROM nightly_rates WHERE room_type_id = ${input.roomTypeId} AND rate_plan_id = ${input.ratePlanId} AND stay_date = ${input.stayDate} FOR UPDATE`,
        );
        if (!rate[0])
          throw Object.assign(new Error("Nightly rate row not found."), {
            code: "MISSING",
          });
        await tx
          .update(nightlyInventory)
          .set({ allotment: input.allotment, blackout: input.blackout })
          .where(
            and(
              eq(nightlyInventory.roomTypeId, input.roomTypeId),
              eq(nightlyInventory.stayDate, input.stayDate),
            ),
          );
        await tx
          .update(nightlyRates)
          .set({ pricePaise: input.pricePaise })
          .where(
            and(
              eq(nightlyRates.roomTypeId, input.roomTypeId),
              eq(nightlyRates.ratePlanId, input.ratePlanId),
              eq(nightlyRates.stayDate, input.stayDate),
            ),
          );
      });
      return NextResponse.json({ ok: true });
    } finally {
      await close();
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "MISSING"
    )
      return NextResponse.json(
        { error: "This date is not configured." },
        { status: 409 },
      );
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "CONFLICT"
    )
      return NextResponse.json(
        {
          error:
            "Allotment cannot be below booked rooms or above the website ceiling.",
        },
        { status: 409 },
      );
    return errorResponse(error);
  }
}
