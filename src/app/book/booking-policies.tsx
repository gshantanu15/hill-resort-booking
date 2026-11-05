"use client";
import { useEffect, useRef, useState } from "react";
import { bookingTerms, dataUseNotice } from "@/lib/booking-policies";
type Field = "termsAccepted" | "dataUseAccepted";
type Props = {
  termsAccepted: boolean;
  dataUseAccepted: boolean;
  onChange: (field: Field, value: boolean) => void;
  disabled?: boolean;
  error?: boolean;
};
export default function BookingPolicies({
  termsAccepted,
  dataUseAccepted,
  onChange,
  disabled,
  error,
}: Props) {
  const [active, setActive] = useState<"terms" | "privacy" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return;
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [active]);
  return (
    <>
      <section className="booking-consent" aria-labelledby="consent-heading">
        <h2 id="consent-heading">Before you continue</h2>
        <p className="booking-policy-draft">
          Non-binding draft for review. These documents do not create real
          booking or service obligations.
        </p>
        {(
          [
            {
              field: "termsAccepted",
              id: "accept-terms",
              checked: termsAccepted,
              label: "I am 18 or older and accept the booking terms.",
              section: "terms",
              link: "Read booking terms",
            },
            {
              field: "dataUseAccepted",
              id: "accept-privacy",
              checked: dataUseAccepted,
              label:
                "I agree to the use of my booking details to process and manage this booking, as explained in the data-use notice.",
              section: "privacy",
              link: "Read data-use notice",
            },
          ] as const
        ).map((item) => (
          <div className="booking-consent-choice" key={item.id}>
            <input
              id={item.id}
              type="checkbox"
              checked={item.checked}
              disabled={disabled}
              aria-invalid={!!error && !item.checked}
              aria-describedby={`${item.id}-error`}
              onChange={(event) => onChange(item.field, event.target.checked)}
            />
            <div>
              <label htmlFor={item.id}>{item.label}</label>
              <button
                type="button"
                className="text-button"
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setActive(item.section);
                }}
              >
                {item.link}
              </button>
              <p id={`${item.id}-error`} className="field-error">
                {error && !item.checked
                  ? "Review this document and accept to continue."
                  : ""}
              </p>
            </div>
          </div>
        ))}
      </section>
      <dialog
        ref={dialog}
        className="booking-policy-dialog"
        aria-labelledby="policy-title"
        onClose={() => {
          setActive(null);
          trigger.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls =
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            first = controls[0],
            last = controls[controls.length - 1];
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        }}
      >
        <div className="booking-policy-dialog-head">
          <h2 id="policy-title" tabIndex={-1}>
            {active === "privacy" ? "Data-use notice" : "Booking terms"}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close policy"
          >
            ×
          </button>
        </div>
        <p className="booking-policy-draft">
          Non-binding review draft v0.2. Proposed business terms and data
          practices; not in force. This preview creates no real booking or
          service obligations.
        </p>
        <div className="booking-policy-dialog-body">
          {(active === "privacy" ? dataUseNotice : bookingTerms).map((item) => (
            <section key={item.heading}>
              <h3>{item.heading}</h3>
              <p>{item.body}</p>
            </section>
          ))}
        </div>
        <button
          type="button"
          className="button policy-return"
          onClick={() => dialog.current?.close()}
        >
          Return to review
        </button>
      </dialog>
    </>
  );
}
