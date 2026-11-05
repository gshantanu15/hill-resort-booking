"use client";
import { useEffect, useRef, useState } from "react";
import type { EnquiryAIOutput } from "@/lib/enquiry-ai-output";
import {
  FIRST_STAY_DATE,
  LAST_STAY_DATE,
  MAX_CHECK_OUT_DATE,
} from "@/lib/booking-validation";
type Row = {
  roomTypeId: string;
  quantity: number;
  adults: string;
  children: string;
};
type Props = {
  enquiry: {
    id: string;
    draft: string | null;
    extracted: EnquiryAIOutput | null;
    category: string;
    pricing?: {
      totalPaise: number;
      checkedAt: string;
      expiresAt: string;
    } | null;
  };
  canQuote: () => boolean;
  onUpdated: (enquiry: unknown) => void;
  onBusy: (busy: boolean) => void;
};
const rooms = [
  { id: "estate-room", name: "Estate room" },
  { id: "estate-villa", name: "Estate villa" },
  { id: "garden-room", name: "Garden room" },
];
export default function EnquiryQuote({
  enquiry,
  canQuote,
  onUpdated,
  onBusy,
}: Props) {
  const d = enquiry.extracted?.dates,
    g = enquiry.extracted?.guests;
  const [expired, setExpired] = useState(() =>
    Boolean(
      enquiry.pricing &&
      new Date(enquiry.pricing.expiresAt).getTime() < Date.now(),
    ),
  );
  useEffect(() => {
    if (!enquiry.pricing) return;
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, new Date(enquiry.pricing.expiresAt).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [enquiry.pricing]);
  const [open, setOpen] = useState(false),
    [checkIn, setCheckIn] = useState(d?.checkIn ?? ""),
    [checkOut, setCheckOut] = useState(d?.checkOut ?? ""),
    [rows, setRows] = useState<Row[]>([
      {
        roomTypeId: "",
        quantity: 1,
        adults: g?.adults == null ? "" : String(g.adults),
        children: g?.children == null ? "" : String(g.children),
      },
    ]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const update = (i: number, k: keyof Row, v: string | number) =>
    setRows((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current || !canQuote()) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/staff/enquiries/${enquiry.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: {
            checkIn,
            checkOut,
            adults: rows.reduce((n, x) => n + (Number(x.adults) || 0), 0),
            children: rows.reduce((n, x) => n + (Number(x.children) || 0), 0),
            items: rows.map((x) => ({
              roomTypeId: x.roomTypeId,
              quantity: x.quantity,
              adults: Number(x.adults),
              children: Number(x.children),
            })),
          },
          expectedDraft: enquiry.draft ?? "",
        }),
        signal: AbortSignal.timeout(30000),
      });
      const b = await r.json().catch(() => null);
      if (!r.ok || !b?.enquiry)
        throw new Error(
          b?.error ||
            "The accommodation quote could not be confirmed. Your form remains available.",
        );
      onUpdated(b.enquiry);
      setMessage("Accommodation quote inserted for staff review.");
    } catch (x) {
      setMessage(
        x instanceof Error
          ? x.message
          : "The quote could not be confirmed. Your form remains available.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <details
      className="ei-quote"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Add accommodation quote</summary>
      {enquiry.pricing && (
        <p>
          Accommodation only: ₹
          {(enquiry.pricing.totalPaise / 100).toLocaleString("en-IN")}; checked{" "}
          {new Date(enquiry.pricing.checkedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}{" "}
          ; expires{" "}
          {new Date(enquiry.pricing.expiresAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST. {expired && "Expired; recheck before using this quote."}
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="ei-quote-fields">
          <div className="ei-quote-dates">
            <label>
              Check-in
              <input
                type="date"
                min={FIRST_STAY_DATE}
                max={LAST_STAY_DATE}
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </label>
            <label>
              Check-out
              <input
                type="date"
                min={FIRST_STAY_DATE}
                max={MAX_CHECK_OUT_DATE}
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </label>
          </div>
          {rows.map((row, i) => (
            <div className="ei-quote-row" key={i}>
              <label>
                Room type
                <select
                  required
                  value={row.roomTypeId}
                  onChange={(e) => update(i, "roomTypeId", e.target.value)}
                >
                  <option value="">Choose room type</option>
                  {rooms.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  required
                  value={row.quantity}
                  onChange={(e) =>
                    update(i, "quantity", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Adults
                <input
                  type="number"
                  min={1}
                  required
                  value={row.adults}
                  onChange={(e) => update(i, "adults", e.target.value)}
                />
              </label>
              <label>
                Children
                <input
                  type="number"
                  min={0}
                  required
                  value={row.children}
                  onChange={(e) => update(i, "children", e.target.value)}
                />
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="ei-control"
                  onClick={() => setRows((a) => a.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {rows.length < 3 && (
            <button
              type="button"
              className="ei-control"
              onClick={() =>
                setRows((a) => [
                  ...a,
                  { roomTypeId: "", quantity: 1, adults: "", children: "" },
                ])
              }
            >
              Add room type
            </button>
          )}
          <button type="submit" className="ei-control" disabled={busy}>
            {busy ? "Checking…" : "Insert room quote"}
          </button>
          {message && <p role="status">{message}</p>}
        </fieldset>
      </form>
    </details>
  );
}
