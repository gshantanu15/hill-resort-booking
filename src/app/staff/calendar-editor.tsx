"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPaise, parsePricePaise } from "@/lib/staff-inventory";

type Row = {
  roomTypeId: string;
  roomName: string;
  stayDate: string;
  pricePaise: number;
  allotment: number;
  booked: number;
  websiteLimit: number;
  blackout: boolean;
};

export default function CalendarEditor() {
  const router = useRouter();
  const [start, setStart] = useState("2026-11-03");
  const [end, setEnd] = useState("2026-11-10");
  const [rows, setRows] = useState<Row[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/staff/inventory?start=${start}&end=${end}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.rows);
      setPrices(
        Object.fromEntries(
          body.rows.map((row: Row) => [
            `${row.roomTypeId}:${row.stayDate}`,
            formatPaise(row.pricePaise),
          ]),
        ),
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to load calendar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(row: Row) {
    const key = `${row.roomTypeId}:${row.stayDate}`;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/staff/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomTypeId: row.roomTypeId,
          stayDate: row.stayDate,
          ratePlanId: "standard-stay",
          pricePaise: parsePricePaise(prices[key]),
          allotment: row.allotment,
          blackout: row.blackout,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage(`Saved ${row.roomName} for ${row.stayDate}.`);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.push("/staff/login");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to sign out.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="staff-editor" aria-busy={busy}>
      <div className="staff-actions">
        <Link href="/">Guest site</Link>
        <button
          className="staff-button"
          disabled={busy}
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
      <p>
        Select dates and load the calendar. Prices include GST; saved bookings
        retain their confirmed prices.
      </p>
      <form
        className="staff-form"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          From
          <input
            type="date"
            value={start}
            disabled={busy}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <label>
          Through (exclusive)
          <input
            type="date"
            value={end}
            disabled={busy}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
        <button className="staff-button" disabled={busy}>
          Load calendar
        </button>
      </form>
      {message && (
        <p className="staff-notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="staff-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="staff-table-wrap"
        role="region"
        aria-label="Nightly rates and stock; scroll horizontally for more columns"
        tabIndex={0}
      >
        <table className="staff-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Date</th>
              <th>Price incl. GST (INR)</th>
              <th>Allotment</th>
              <th>Booked</th>
              <th>Ceiling</th>
              <th>Blackout</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = `${row.roomTypeId}:${row.stayDate}`;
              return (
                <tr key={key}>
                  <th scope="row">{row.roomName}</th>
                  <td>{row.stayDate}</td>
                  <td>
                    <label className="sr-only" htmlFor={`price-${key}`}>
                      Price for {row.roomName} {row.stayDate}
                    </label>
                    <input
                      id={`price-${key}`}
                      inputMode="decimal"
                      value={prices[key] ?? ""}
                      disabled={busy}
                      onChange={(event) =>
                        setPrices((values) => ({
                          ...values,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>
                    <label className="sr-only" htmlFor={`allotment-${key}`}>
                      Allotment for {row.roomName} {row.stayDate}
                    </label>
                    <input
                      id={`allotment-${key}`}
                      type="number"
                      min={row.booked}
                      max={row.websiteLimit}
                      step="1"
                      value={row.allotment}
                      disabled={busy}
                      onChange={(event) =>
                        setRows((values) =>
                          values.map((value) =>
                            value === row
                              ? {
                                  ...value,
                                  allotment: Number(event.target.value),
                                }
                              : value,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>{row.booked}</td>
                  <td>{row.websiteLimit}</td>
                  <td>
                    <label className="staff-checkbox">
                      <span className="sr-only">
                        Blackout {row.roomName} {row.stayDate}
                      </span>
                      <input
                        type="checkbox"
                        checked={row.blackout}
                        disabled={busy}
                        onChange={(event) =>
                          setRows((values) =>
                            values.map((value) =>
                              value === row
                                ? { ...value, blackout: event.target.checked }
                                : value,
                            ),
                          )
                        }
                      />
                    </label>
                  </td>
                  <td>
                    <button
                      className="staff-button"
                      disabled={busy}
                      onClick={() => void save(row)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!busy && !rows.length && (
        <p>
          No calendar loaded, or no configured nights in the selected range.
        </p>
      )}
    </section>
  );
}
