"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Quote } from "@/lib/booking";
import Image from "next/image";
import StayDatePicker from "./stay-date-picker";
import BookingFeedback from "./booking-feedback";
import BookingPolicies from "./booking-policies";
import { BOOKING_TERMS_VERSION } from "@/lib/booking-policies";
import {
  currentAcceptance,
  type BookingAcceptance,
} from "@/lib/booking-acceptance";
import { contactSchema, phoneProblem } from "@/lib/booking-contact";
import {
  withGuestTotals,
  quantityLimit,
  guestCounts,
  safeMessage,
} from "@/lib/guest-selection";
import { accommodationDetails } from "@/lib/accommodation";
import {
  validateSelection,
  validateOccupancy,
  type BookingSelection,
} from "@/lib/booking-validation";
type Room = { id: string; name: string; description: string; capacity: number };
type Contact = { name: string; email: string; phone: string };
type Pending = {
  selection: BookingSelection;
  contact: Contact;
  submissionId: string;
  quoteToken: string;
  paymentOutcome: "success" | "failure";
  acceptance?: BookingAcceptance;
};
type Draft = {
  selection: BookingSelection;
  contact: Contact;
  step: number;
  quote: Quote | null;
  pending: Pending | null;
  accepted: boolean;
  termsAccepted: boolean;
  dataUseAccepted: boolean;
  policyVersion: string;
};
type Available = {
  roomTypeId: string;
  available: number;
  reason: string | null;
};
const key = "aavana-booking-draft";
const money = (p: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(p / 100);
const initial = (id: string): Draft => ({
  selection: {
    checkIn: "",
    checkOut: "",
    adults: 2,
    children: 0,
    items: [{ roomTypeId: id, quantity: 1, adults: 2, children: 0 }],
  },
  contact: { name: "", email: "", phone: "" },
  step: 1,
  quote: null,
  pending: null,
  accepted: false,
  termsAccepted: false,
  dataUseAccepted: false,
  policyVersion: BOOKING_TERMS_VERSION,
});
export default function Checkout({ rooms }: { rooms: Room[] }) {
  const router = useRouter(),
    sending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [available, setAvailable] = useState<Available[] | null>(null),
    [availabilityError, setAvailabilityError] = useState(""),
    [checking, setChecking] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof Contact, string>>
  >({});
  const [consentError, setConsentError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const requested = new URLSearchParams(location.search).get("room");
      const selected = rooms.some((r) => r.id === requested)
        ? requested!
        : (rooms[0]?.id ?? "estate-room");
      try {
        const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
        if (saved?.selection && saved.contact && [1, 2, 3].includes(saved.step))
          setDraft({
            ...saved,
            termsAccepted:
              saved.policyVersion === BOOKING_TERMS_VERSION &&
              saved.termsAccepted === true,
            dataUseAccepted:
              saved.policyVersion === BOOKING_TERMS_VERSION &&
              saved.dataUseAccepted === true,
            policyVersion: BOOKING_TERMS_VERSION,
            selection: saved.pending
              ? saved.selection
              : withGuestTotals(saved.selection),
            step: saved.pending ? 3 : saved.quote ? saved.step : 1,
          });
        else setDraft(initial(selected));
      } catch {
        setDraft(initial(selected));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [rooms]);
  useEffect(() => {
    if (draft)
      try {
        sessionStorage.setItem(key, JSON.stringify(draft));
      } catch {
        /* Payment verifies storage before sending. */
      }
  }, [draft]);
  useEffect(() => {
    heading.current?.focus();
  }, [draft?.step]);
  const checkIn = draft?.selection.checkIn ?? "",
    checkOut = draft?.selection.checkOut ?? "";
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setChecking(true);
      setAvailable(null);
      setAvailabilityError("");
      try {
        const r = await fetch(
          `/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
          { signal: controller.signal },
        );
        const b = await r.json();
        if (!r.ok)
          throw Error(
            safeMessage(b.error, "We could not check this stay. Please retry."),
          );
        if (!controller.signal.aborted) setAvailable(b.rooms);
      } catch (e) {
        if (!controller.signal.aborted)
          setAvailabilityError(
            safeMessage(
              e instanceof Error ? e.message : null,
              "Unable to check availability. Please retry.",
            ),
          );
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [checkIn, checkOut, refresh]);
  function change(selection: BookingSelection) {
    if (!draft || draft.pending || busy) return;
    setDraft({
      ...draft,
      selection: withGuestTotals(selection),
      quote: null,
      accepted: false,
    });
    setError("");
  }
  async function getQuote() {
    if (!draft || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const selection = validateSelection(withGuestTotals(draft.selection));
      validateOccupancy(
        selection,
        rooms.map((r) => ({ ...r, websiteLimit: Number.MAX_SAFE_INTEGER })),
      );
      const r = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selection),
      });
      const b = await r.json();
      if (!r.ok)
        throw Error(
          safeMessage(b.error, "We could not check this stay. Please retry."),
        );
      setDraft({
        ...draft,
        selection: b.selection,
        quote: b,
        step: 2,
        accepted: true,
      });
    } catch (e) {
      setError(
        safeMessage(
          e instanceof Error ? e.message : null,
          "Unable to price your stay. Please retry.",
        ),
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function validateDetails() {
    if (!draft) return false;
    const result = contactSchema.safeParse(draft.contact);
    const errors: Partial<Record<keyof Contact, string>> = {};
    if (!result.success)
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Contact;
        if (!errors[field]) errors[field] = issue.message;
      }
    setContactErrors(errors);
    const first = (Object.keys(errors) as (keyof Contact)[])[0];
    if (first) {
      setError(errors[first]!);
      document.getElementById(`contact-${first}`)?.focus();
      return false;
    }
    if (
      !draft.termsAccepted ||
      !draft.dataUseAccepted ||
      draft.policyVersion !== BOOKING_TERMS_VERSION
    ) {
      setConsentError(true);
      setError(
        "Review and accept the booking terms and data-use notice before continuing. Neither choice is preselected.",
      );
      document
        .getElementById(
          !draft.termsAccepted ? "accept-terms" : "accept-privacy",
        )
        ?.focus();
      return false;
    }
    setConsentError(false);
    return true;
  }
  async function pay() {
    if (
      !draft ||
      sending.current ||
      (!draft.pending && (!draft.quote || !draft.accepted))
    )
      return;
    if (!draft.pending && !validateDetails()) {
      setDraft({ ...draft, step: 2 });
      return;
    }
    const request: Pending = draft.pending ?? {
      selection: draft.selection,
      contact: draft.contact,
      submissionId: crypto.randomUUID(),
      quoteToken: draft.quote!.token,
      paymentOutcome: outcome,
      acceptance: currentAcceptance(),
    };
    const next = { ...draft, pending: request, step: 3 };
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      setError(
        "Payment cannot start because recovery information cannot be saved. Enable browser storage and retry.",
      );
      return;
    }
    setDraft(next);
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const b = await r.json();
      if (r.ok) {
        sessionStorage.setItem(
          key,
          JSON.stringify({ ...next, confirmationId: b.id }),
        );
        router.replace(`/book/confirmation/${b.id}`);
        return;
      }
      if (r.status === 409 && b.updatedQuote) {
        setDraft({
          ...draft,
          pending: null,
          quote: b.updatedQuote,
          accepted: false,
          step: 2,
        });
        setError(
          "Your quote changed or expired. Review and accept the refreshed total before continuing.",
        );
      } else if (r.status === 402 && b.code === "PAYMENT_FAILED") {
        setDraft({ ...draft, pending: null });
        setError(
          "Test payment declined. No booking was made and no inventory was reserved. Choose a successful payment and try again.",
        );
      } else if (
        r.status < 500 &&
        ["POLICY_ACCEPTANCE_REQUIRED", "INVALID_CONTACT"].includes(b.code)
      ) {
        setDraft({
          ...draft,
          pending: null,
          step: 2,
          ...(b.code === "POLICY_ACCEPTANCE_REQUIRED"
            ? { termsAccepted: false, dataUseAccepted: false }
            : {}),
        });
        setError(
          safeMessage(
            b.error,
            "Review your contact details and agreement choices.",
          ),
        );
      } else if (r.status < 500) {
        setDraft({
          ...draft,
          pending: null,
          quote: null,
          accepted: false,
          step: 1,
        });
        setAvailable(null);
        setRefresh((n) => n + 1);
        setError(safeMessage(b.error, "Please review your selection."));
      } else throw Error();
    } catch {
      setError(
        "We could not verify the result. Your request is saved. Retry this same payment to safely retrieve or complete your booking.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (!draft)
    return (
      <main className="booking-shell" aria-busy="true">
        <p role="status">Preparing your stay…</p>
      </main>
    );
  const { selection, contact, quote, step, pending } = draft;
  const locked = busy || !!pending;
  const guestTotal = selection.items.reduce(
    (sum, item) => sum + item.adults + item.children,
    0,
  );
  const updateItem = (
    id: string,
    patch: Partial<BookingSelection["items"][number]>,
  ) =>
    change({
      ...selection,
      items: selection.items.map((item) =>
        item.roomTypeId === id ? { ...item, ...patch } : item,
      ),
    });
  function adjustQuantity(room: Room, delta: number) {
    const item = selection.items.find((i) => i.roomTypeId === room.id),
      value = (item?.quantity ?? 0) + delta;
    const limit = quantityLimit(
      available?.find((r) => r.roomTypeId === room.id)?.available,
    );
    if (value < 0 || (delta > 0 && value > limit)) return;
    change({
      ...selection,
      items:
        value === 0
          ? selection.items.filter((i) => i.roomTypeId !== room.id)
          : item
            ? selection.items.map((i) =>
                i.roomTypeId === room.id ? { ...i, quantity: value } : i,
              )
            : [
                ...selection.items,
                {
                  roomTypeId: room.id,
                  quantity: value,
                  adults: 1,
                  children: 0,
                },
              ],
    });
  }
  return (
    <main className="booking-shell">
      <header className="guest-book-header">
        <Link className="wordmark" href="/">
          Aavana <span>Estate</span>
        </Link>
        <nav aria-label="Guest navigation">
          <Link href="/#stays">Stays</Link>
        </nav>
      </header>
      <div className="booking-workspace">
        <div className="booking-heading">
          <h1 ref={heading} tabIndex={-1}>
            {step === 1
              ? "Make the dates yours."
              : step === 2
                ? "Your details and review"
                : "One last look."}
          </h1>
          <ol className="booking-steps" aria-label="Booking progress">
            {["Stay", "Details", "Confirm"].map((name, i) => (
              <li
                key={name}
                aria-current={step === i + 1 ? "step" : undefined}
                className={step === i + 1 ? "active" : ""}
              >
                <span>{String(i + 1).padStart(2, "0")}</span> {name}
              </li>
            ))}
          </ol>
        </div>
        <div className="booking-layout">
          <section className="booking-panel" aria-busy={busy}>
            <BookingFeedback message={error || availabilityError} busy={busy} />
            {step === 1 && (
              <>
                <StayDatePicker
                  checkIn={selection.checkIn}
                  checkOut={selection.checkOut}
                  disabled={locked}
                  onChange={(dates) => {
                    setAvailable(null);
                    setAvailabilityError("");
                    setChecking(false);
                    change({ ...selection, ...dates });
                  }}
                />
                <p className="availability-status" role="status">
                  {checking
                    ? "Checking your dates…"
                    : available
                      ? "Availability checked. Your stay is reserved when confirmed."
                      : "Choose your arrival and departure to check availability."}
                </p>
                {availabilityError && (
                  <p className="availability-recovery">
                    We could not check these dates.{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setRefresh((n) => n + 1)}
                    >
                      Retry availability
                    </button>
                  </p>
                )}
                <h2 className="rooms-heading">Rooms and villas</h2>
                {rooms.length === 0 && (
                  <p>
                    No accommodation is currently available. Please try again
                    later.
                  </p>
                )}
                <div className="room-options">
                  {rooms.map((room) => {
                    const item = selection.items.find(
                        (i) => i.roomTypeId === room.id,
                      ),
                      stock = available?.find((r) => r.roomTypeId === room.id),
                      limit = quantityLimit(stock?.available),
                      details = accommodationDetails[room.id];
                    const tooMany = !!item && !!stock && item.quantity > limit;
                    return (
                      <article
                        className="pick-row"
                        key={room.id}
                        aria-label={room.name}
                      >
                        <Image
                          className="room-mini"
                          src={primaryPhoto(room.id)}
                          alt={`Illustrative ${room.name.toLowerCase()} interior`}
                          width={96}
                          height={96}
                          sizes="96px"
                        />
                        <div className="room-pick-copy">
                          <h3>{room.name}</h3>
                          <p>Up to {room.capacity} guests per unit</p>
                          {details && (
                            <details
                              className="room-details"
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.currentTarget.open = false;
                                  event.currentTarget
                                    .querySelector("summary")
                                    ?.focus();
                                }
                              }}
                            >
                              <summary>
                                Room details <Chevron />
                              </summary>
                              <div>
                                <p>{room.description}</p>
                                <ul>
                                  {details.amenities.map((amenity) => (
                                    <li key={amenity}>{amenity}</li>
                                  ))}
                                </ul>
                                <small>
                                  Illustrative accommodation details.
                                </small>
                              </div>
                            </details>
                          )}
                          {stock?.available === 0 && (
                            <p className="room-unavailable">
                              Unavailable for these dates
                            </p>
                          )}
                          {tooMany && (
                            <p role="alert">
                              Your selected quantity is no longer available.
                              Reduce it or change dates.
                            </p>
                          )}
                        </div>
                        <div className="quantity">
                          <button
                            type="button"
                            aria-label={`Remove ${room.name}`}
                            disabled={locked || !item}
                            onClick={() => adjustQuantity(room, -1)}
                          >
                            −
                          </button>
                          <output aria-label={`${room.name} quantity`}>
                            {item?.quantity ?? 0}
                          </output>
                          <button
                            type="button"
                            aria-label={`Add ${room.name}`}
                            disabled={
                              locked ||
                              !available ||
                              checking ||
                              (item?.quantity ?? 0) >= limit
                            }
                            onClick={() => adjustQuantity(room, 1)}
                          >
                            +
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <section
                  className="guest-allocation"
                  aria-labelledby="allocation-title"
                >
                  <div className="allocation-heading">
                    <h2 id="allocation-title">Who is coming?</h2>
                    <p>
                      {guestTotal} {guestTotal === 1 ? "guest" : "guests"} in
                      your selection. Adults are 18+. Every unit needs an adult;
                      all children count toward capacity.
                    </p>
                  </div>
                  {selection.items.map((item) => {
                    const room = rooms.find((r) => r.id === item.roomTypeId);
                    if (!room) return null;
                    return (
                      <div className="allocation-row" key={item.roomTypeId}>
                        <span>
                          {room.name} × {item.quantity}
                        </span>
                        {(["adults", "children"] as const).map((field) => (
                          <label key={field}>
                            {field === "adults" ? "Adults" : "Children"}
                            <input
                              type="number"
                              aria-label={`${room.name} ${field}`}
                              min={field === "adults" ? item.quantity : 0}
                              max={item.quantity * room.capacity}
                              disabled={locked}
                              value={item[field]}
                              onChange={(e) =>
                                updateItem(room.id, {
                                  [field]: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </section>
                <button
                  className="button"
                  type="button"
                  disabled={busy || rooms.length === 0}
                  onClick={getQuote}
                >
                  {busy ? "Checking your stay…" : "Continue to review"}
                </button>
              </>
            )}
            {step === 2 && (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!quote || !validateDetails()) return;
                  setDraft({ ...draft, accepted: true, step: 3 });
                  setError("");
                }}
              >
                <h2>Your contact details</h2>
                <p className="muted">A name and email identify your booking.</p>
                <div className="contact-grid">
                  {(["name", "email", "phone"] as const).map((field) => (
                    <label key={field}>
                      {field === "name"
                        ? "Full name"
                        : field === "email"
                          ? "Email"
                          : "Phone (optional)"}
                      <input
                        id={`contact-${field}`}
                        aria-label={
                          field === "name"
                            ? "Full name"
                            : field === "email"
                              ? "Email"
                              : "Phone (optional)"
                        }
                        aria-invalid={!!contactErrors[field]}
                        aria-describedby={`${field === "phone" ? "phone-hint " : ""}${field}-error`}
                        onBlur={() => {
                          if (field === "phone") {
                            const message = phoneProblem(contact.phone);
                            setContactErrors((previous) => ({
                              ...previous,
                              phone: message,
                            }));
                            if (message) setError(message);
                          }
                        }}
                        required={field !== "phone"}
                        type={
                          field === "email"
                            ? "email"
                            : field === "phone"
                              ? "tel"
                              : "text"
                        }
                        autoComplete={field === "phone" ? "tel" : field}
                        maxLength={
                          field === "name" ? 120 : field === "email" ? 254 : 32
                        }
                        value={contact[field]}
                        onChange={(event) => {
                          setContactErrors((previous) => ({
                            ...previous,
                            [field]: "",
                          }));
                          setError("");
                          setDraft({
                            ...draft,
                            contact: {
                              ...contact,
                              [field]: event.target.value,
                            },
                          });
                        }}
                      />
                      {field === "phone" && (
                        <small id="phone-hint">
                          Include your country code, for example +91 98765
                          43210. Leave blank if you prefer.
                        </small>
                      )}
                      <span id={`${field}-error`} className="field-error">
                        {contactErrors[field]}
                      </span>
                    </label>
                  ))}
                </div>
                {quote && <Price quote={quote} />}
                <BookingPolicies
                  termsAccepted={draft.termsAccepted}
                  dataUseAccepted={draft.dataUseAccepted}
                  disabled={locked}
                  error={consentError}
                  onChange={(field, value) => {
                    setDraft({
                      ...draft,
                      [field]: value,
                      policyVersion: BOOKING_TERMS_VERSION,
                    });
                    setError("");
                  }}
                />
                <div className="actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setDraft({ ...draft, step: 1 })}
                  >
                    Back to selection
                  </button>
                  <button className="button" type="submit">
                    {draft.accepted
                      ? "Continue to test payment"
                      : "Accept updated total and continue"}
                  </button>
                </div>
              </form>
            )}
            {step === 3 && (
              <>
                <div className="payment-intro">
                  <span className="review-mark">
                    <ReviewIcon />
                  </span>
                  <div>
                    <h2>Review and pay</h2>
                    <p>Test payment. No card details or money charged.</p>
                  </div>
                </div>
                {quote && <Price quote={quote} />}
                {pending && (
                  <p className="booking-notice" role="status">
                    Your payment request is saved. Retry it unchanged to verify
                    the result before making any changes.
                  </p>
                )}
                <div className="outcome-row">
                  <div>
                    <span id="test-outcome-label">Test payment outcome</span>
                    <small>No money is charged in either state.</small>
                  </div>
                  <div className="outcome-control">
                    <span id="outcome-state">
                      {(pending?.paymentOutcome ?? outcome) === "success"
                        ? "Successful"
                        : "Declined"}
                    </span>
                    <button
                      type="button"
                      className="squish-switch"
                      role="switch"
                      aria-labelledby="test-outcome-label"
                      aria-describedby="outcome-state"
                      aria-checked={
                        (pending?.paymentOutcome ?? outcome) === "success"
                      }
                      disabled={locked}
                      onClick={() => {
                        setOutcome((value) =>
                          value === "success" ? "failure" : "success",
                        );
                        setError("");
                      }}
                    >
                      <span className="switch-track" aria-hidden="true">
                        <span className="switch-thumb" />
                      </span>
                    </button>
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="text-button"
                    type="button"
                    disabled={locked}
                    onClick={() => setDraft({ ...draft, step: 2 })}
                  >
                    Back to review
                  </button>
                  <button
                    className="button"
                    type="button"
                    disabled={busy}
                    onClick={pay}
                  >
                    {busy
                      ? "Verifying your booking…"
                      : pending
                        ? "Retry saved payment"
                        : `Pay ${money(quote?.totalPaise ?? 0)} (test payment)`}
                  </button>
                </div>
              </>
            )}
          </section>
          <aside className="booking-aside" aria-label="Stay summary">
            <Image
              src="/images/design/blassenstein-erlauftal-mit-nebel-02-panorama-1920.jpg"
              alt="Illustrative misty hills"
              width={640}
              height={720}
              sizes="(max-width: 800px) 1px, 310px"
            />
            <div className="aside-content">
              <h2>Your stay</h2>
              <div className="stay-dates">
                <div>
                  <span>Arrival</span>
                  <strong>{formatDate(selection.checkIn)}</strong>
                </div>
                <div>
                  <span>Departure</span>
                  <strong>{formatDate(selection.checkOut)}</strong>
                </div>
              </div>
              <p>{guestCounts(selection.adults, selection.children)}</p>
              {selection.items.map((item) => (
                <p key={item.roomTypeId}>
                  {rooms.find((r) => r.id === item.roomTypeId)?.name} ×{" "}
                  {item.quantity}
                </p>
              ))}
              <div className="aside-total">
                <span>Total including GST</span>
                {quote ? (
                  <strong>{money(quote.totalPaise)}</strong>
                ) : (
                  <p>Continue to review for your exact total.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <footer className="booking-footer">
        <p>Fictional resort demo. No real payments.</p>
        <details className="guest-photo-credits">
          <summary>Illustrative photography</summary>
          <p data-credits>
            Interiors:{" "}
            <a href="https://commons.wikimedia.org/wiki/User:Basile_Morin">
              Basile Morin
            </a>
            , CC BY-SA 4.0. Landscape:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Blassenstein_Erlauftal_mit_Nebel_02_Panorama.JPG">
              Uoaei1
            </a>
            , CC BY-SA 3.0. These photographs do not depict Aavana Estate.
          </p>
        </details>
      </footer>
    </main>
  );
}
function formatDate(value: string) {
  if (!value) return "Choose dates";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(+date)
    ? "Choose dates"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}
function primaryPhoto(id: string) {
  return (
    "/images/design/" +
    ({
      "estate-room":
        "canopy-bed-of-khan-pool-suite-in-amantaka-luxury-resort-hote-1920.jpg",
      "garden-room":
        "canopy-bed-and-wardrobes-in-khan-pool-suite-at-amantaka-luxu-1920.jpg",
      "estate-villa":
        "lobby-lounge-of-amantaka-suite-amantaka-luxury-resort-hotel--1920.jpg",
    }[id] ??
      "canopy-bed-of-khan-pool-suite-in-amantaka-luxury-resort-hote-1920.jpg")
  );
}
function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3H5v18h8M13 3l5 5h-5V3ZM8 8h2M8 12h3M8 16h3" />
      <circle cx="17" cy="15" r="3" />
      <path d="m19.2 17.2 2.3 2.3" />
    </svg>
  );
}
function Price({ quote }: { quote: Quote }) {
  return (
    <div className="price-breakdown">
      <div className="review-dates">
        <div>
          <span>Arrival</span>
          <strong>{formatDate(quote.selection.checkIn)}</strong>
        </div>
        <div>
          <span>Departure</span>
          <strong>{formatDate(quote.selection.checkOut)}</strong>
        </div>
      </div>
      <p>{guestCounts(quote.selection.adults, quote.selection.children)}</p>
      <dl className="quote-totals">
        <div>
          <dt>Accommodation before GST</dt>
          <dd>{money(quote.subtotalPaise)}</dd>
        </div>
        <div>
          <dt>Included GST</dt>
          <dd>{money(quote.taxPaise)}</dd>
        </div>
        <div className="total">
          <dt>Total including GST</dt>
          <dd>{money(quote.totalPaise)}</dd>
        </div>
      </dl>
      <details className="nightly-details">
        <summary>View nightly breakdown</summary>
        <table className="night-table">
          <caption>Nightly charges, including GST</caption>
          <thead>
            <tr>
              <th scope="col">Stay night</th>
              <th scope="col">Accommodation</th>
              <th scope="col">Units</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.nights.map((n) => (
              <tr key={`${n.roomTypeId}-${n.stayDate}`}>
                <th scope="row">{formatDate(n.stayDate)}</th>
                <td>{n.roomTypeName}</td>
                <td>{n.quantity}</td>
                <td>{money(n.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total including GST
              </th>
              <td>{money(quote.totalPaise)}</td>
            </tr>
          </tfoot>
        </table>
      </details>
      <p className="quote-expiry">
        Quote valid until{" "}
        {new Date(quote.expiresAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        })}{" "}
        IST. Final availability is checked on confirmation.
      </p>
    </div>
  );
}
