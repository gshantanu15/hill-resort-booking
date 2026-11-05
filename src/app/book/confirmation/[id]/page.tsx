import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDatabase } from "@/db/client";
import { BookingError, getConfirmation } from "@/lib/booking";
import "../../confirmation.css";
import ClearDraft from "../clear-draft";
import CopyReference from "../copy-reference";
import { guestCounts } from "@/lib/guest-selection";
import EmailPreview from "../email-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
function dateLabel(value: string, weekday = false) {
  return new Intl.DateTimeFormat("en-IN", {
    ...(weekday
      ? { weekday: "long" as const }
      : {
          day: "numeric" as const,
          month: "long" as const,
          year: "numeric" as const,
        }),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value + "T00:00:00+05:30"));
}

export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let booking: Awaited<ReturnType<typeof getConfirmation>> | null = null;
  let unavailable = false;
  let close: (() => Promise<void>) | undefined;
  try {
    const connection = getDatabase();
    close = connection.close;
    booking = await getConfirmation(connection.db, id);
  } catch (error) {
    if (error instanceof BookingError && error.code === "NOT_FOUND") notFound();
    unavailable = true;
  } finally {
    await close?.();
  }
  if (!booking)
    return (
      <main className="confirmation-page">
        <ConfirmationHeader />
        <section className="confirmation-error" role="alert">
          <h1>
            {unavailable
              ? "We could not load that booking."
              : "Booking not found."}
          </h1>
          <p>Retry this reference before starting another booking.</p>
          <a
            className="confirmation-button"
            href={"/book/confirmation/" + encodeURIComponent(id)}
          >
            Retry confirmation
          </a>
        </section>
      </main>
    );
  return (
    <main className="confirmation-page">
      <ConfirmationHeader />
      <ClearDraft id={booking.id} />
      <section className="confirmation-card">
        <div className="confirmation-copy">
          <div className="confirmation-heading">
            <span className="confirmation-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            <div>
              <h1>Your demo booking is saved.</h1>
              <p className="confirmation-lead">
                Your test journey is complete.
              </p>
            </div>
          </div>
          <p className="demo-payment-note">
            No real accommodation was reserved. No money was charged.
          </p>
          <EmailPreview
            reference={booking.id}
            checkIn={dateLabel(booking.selection.checkIn)}
            checkOut={dateLabel(booking.selection.checkOut)}
            accommodation={booking.selection.items
              .map((item) => `${item.quantity} ${item.roomTypeName}`)
              .join(", ")}
            total={money(booking.totalPaise)}
          />
          <div className="confirmation-reference">
            <div>
              <span>Booking reference</span>
              <strong id="booking-reference">{booking.id}</strong>
            </div>
            <CopyReference reference={booking.id} />
          </div>
          <div className="stay-summary">
            <div>
              <span>Arrival</span>
              <strong>
                {dateLabel(booking.selection.checkIn, true)}
                <br />
                {dateLabel(booking.selection.checkIn)}
              </strong>
            </div>
            <div>
              <span>Departure</span>
              <strong>
                {dateLabel(booking.selection.checkOut, true)}
                <br />
                {dateLabel(booking.selection.checkOut)}
              </strong>
            </div>
          </div>
          <p className="guest-summary">
            {guestCounts(booking.selection.adults, booking.selection.children)}
          </p>
          <section className="charge-section" aria-labelledby="charge-heading">
            <h2 id="charge-heading">Accommodation and charges</h2>
            <div className="night-table-wrap">
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
                  {booking.nights.map((night) => {
                    const item = booking.selection.items.find(
                      (entry) => entry.roomTypeId === night.roomTypeId,
                    );
                    return (
                      <tr key={night.roomTypeId + "-" + night.stayDate}>
                        <th scope="row">{dateLabel(night.stayDate)}</th>
                        <td>{item?.roomTypeName ?? night.roomTypeId}</td>
                        <td>{item?.quantity ?? 1}</td>
                        <td>{money(night.totalPaise)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <dl className="confirmation-total">
              <div>
                <dt>Accommodation before GST</dt>
                <dd>{money(booking.subtotalPaise)}</dd>
              </div>
              <div>
                <dt>Included GST</dt>
                <dd>{money(booking.taxPaise)}</dd>
              </div>
              <div className="total">
                <dt>Total including GST</dt>
                <dd>{money(booking.totalPaise)}</dd>
              </div>
            </dl>
          </section>
          <Link className="confirmation-button" href="/#stays">
            Return to stays
          </Link>
        </div>
        <div className="confirmation-photo">
          <Image
            src="/images/design/lobby-lounge-of-amantaka-suite-amantaka-luxury-resort-hotel--1920.jpg"
            alt="Illustrative resort lounge, not a photograph of the fictional estate"
            width={960}
            height={1200}
            sizes="(max-width: 760px) 100vw, 40vw"
          />
        </div>
      </section>
      <footer className="confirmation-credits">
        <p data-credits>
          Illustrative photography:{" "}
          <a href="https://commons.wikimedia.org/wiki/User:Basile_Morin">
            Basile Morin
          </a>
          , CC BY-SA 4.0. This photograph does not depict Aavana Estate.
        </p>
      </footer>
    </main>
  );
}
function ConfirmationHeader() {
  return (
    <header className="confirmation-header">
      <Link className="wordmark" href="/">
        Aavana <span>Estate</span>
      </Link>
      <nav aria-label="Confirmation navigation">
        <Link href="/#stays">Stays</Link>
        <Link href="/book">Book your stay</Link>
      </nav>
    </header>
  );
}
