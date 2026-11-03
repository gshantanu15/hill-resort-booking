import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

async function handle(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch {
    return NextResponse.json(
      { error: "Sign-in service unavailable." },
      { status: 503 },
    );
  }
}
export const GET = handle;
export const POST = handle;
