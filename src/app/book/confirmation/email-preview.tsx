"use client";
import { useRef } from "react";
type Props = {
  reference: string;
  checkIn: string;
  checkOut: string;
  accommodation: string;
  total: string;
};
export default function EmailPreview({
  reference,
  checkIn,
  checkOut,
  accommodation,
  total,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="confirmation-email-followup">
        <p>An email has been sent with your booking details.</p>
        <button
          ref={trigger}
          type="button"
          className="text-button"
          onClick={() => {
            dialog.current?.showModal();
            dialog.current?.querySelector<HTMLElement>("h2")?.focus();
          }}
        >
          Preview confirmation email
        </button>
        <small>
          Example message for design review. No email is sent from this page.
        </small>
      </div>
      <dialog
        ref={dialog}
        className="confirmation-email-dialog"
        aria-labelledby="email-preview-title"
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons =
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            first = buttons[0],
            last = buttons[buttons.length - 1];
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        }}
      >
        <div className="confirmation-email-head">
          <h2 id="email-preview-title" tabIndex={-1}>
            Confirmation email preview
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close email preview"
          >
            ×
          </button>
        </div>
        <p className="confirmation-email-note">
          Example message only. No email is sent from this page.
        </p>
        <div className="confirmation-email-body">
          <p>To: the email address provided during booking</p>
          <p>Subject: Your Aavana Estate booking confirmation</p>
          <h3>Your stay details, together.</h3>
          <p>Reference: {reference}</p>
          <p>Arrival: {checkIn}</p>
          <p>Departure: {checkOut}</p>
          <p>{accommodation}</p>
          <p>Total including GST: {total}</p>
          <p>
            Test payment. No money was charged. Keep your reference private.
          </p>
        </div>
        <button
          type="button"
          className="confirmation-button"
          onClick={() => dialog.current?.close()}
        >
          Back to confirmation
        </button>
      </dialog>
    </>
  );
}
