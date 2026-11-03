import "server-only";
import { NextResponse } from "next/server";
import { BookingError } from "./booking";

export function bookingJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function bookingFailure(error: unknown) {
  if (error instanceof BookingError)
    return bookingJson(
      {
        error: error.message,
        code: error.code,
        ...(error.updatedQuote ? { updatedQuote: error.updatedQuote } : {}),
      },
      error.status,
    );
  return bookingJson(
    {
      error: "Booking service unavailable. Please retry shortly.",
      code: "SERVICE_UNAVAILABLE",
    },
    503,
  );
}
export function quoteSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Booking secret not configured");
  return secret;
}
export async function bookingBody(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new BookingError(
      "INVALID_ORIGIN",
      "Request origin is not allowed.",
      403,
    );
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new BookingError("INVALID_REQUEST", "Send a JSON request.", 415);
  const reader = request.body?.getReader();
  if (!reader)
    throw new BookingError("INVALID_REQUEST", "A request body is required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16384) {
      await reader.cancel();
      throw new BookingError(
        "REQUEST_TOO_LARGE",
        "Request exceeds the supported size.",
        413,
      );
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BookingError("INVALID_REQUEST", "Invalid JSON request.");
  }
}
