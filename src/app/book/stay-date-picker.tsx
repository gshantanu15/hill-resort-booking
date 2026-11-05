"use client";

import { useEffect, useState } from "react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { Button } from "react-aria-components/Button";
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  RangeCalendar,
} from "react-aria-components/RangeCalendar";
import { Dialog, DialogTrigger } from "react-aria-components/Dialog";
import { Modal, ModalOverlay } from "react-aria-components/Modal";
import { Popover } from "react-aria-components/Popover";
import {
  MAX_CHECK_OUT_DATE,
  resortToday,
  validateStay,
} from "@/lib/booking-validation";
import "./stay-date-picker.css";

type Props = {
  checkIn: string;
  checkOut: string;
  onChange: (value: { checkIn: string; checkOut: string }) => void;
  disabled?: boolean;
};
type Draft = { checkIn: string; checkOut: string };

function readable(value: string) {
  if (!value) return "Choose date";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  } catch {
    return value;
  }
}

export default function StayDatePicker({
  checkIn,
  checkOut,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState<Draft>({ checkIn, checkOut });
  const [error, setError] = useState("");
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const min = parseDate(resortToday());
  const max = parseDate(MAX_CHECK_OUT_DATE);
  let selection: { start: CalendarDate; end: CalendarDate } | null = null;
  try {
    if (draft.checkIn && draft.checkOut && draft.checkOut > draft.checkIn)
      selection = {
        start: parseDate(draft.checkIn),
        end: parseDate(draft.checkOut),
      };
  } catch {
    /* typed values can be incomplete */
  }
  const setDraftValue = (value: Draft) => {
    setDraft(value);
    setError("");
  };
  const apply = () => {
    try {
      validateStay(draft.checkIn, draft.checkOut);
      onChange(draft);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Choose a valid arrival and departure.",
      );
    }
  };
  const content = (
    <Dialog
      className="guest-date-picker__dialog"
      aria-labelledby="guest-date-picker-title"
    >
      <div className="guest-date-picker__head">
        <div>
          <h2 id="guest-date-picker-title">Choose your dates</h2>
        </div>
        <Button
          className="guest-date-picker__close"
          onPress={() => setOpen(false)}
          aria-label="Close date picker"
        >
          ×
        </Button>
      </div>
      <RangeCalendar
        className="guest-range-calendar"
        aria-label="Choose arrival and departure"
        autoFocus
        value={selection}
        minValue={min}
        maxValue={max}
        visibleDuration={{ months: 1 }}
        pageBehavior="single"
        firstDayOfWeek="mon"
        onChange={(next) => {
          const value = {
            checkIn: next.start.toString(),
            checkOut: next.end.toString(),
          };
          setDraftValue(value);
          try {
            validateStay(value.checkIn, value.checkOut);
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Choose a valid stay.",
            );
          }
        }}
      >
        {({ state }) => (
          <>
            <div className="guest-date-picker__nav">
              <Button slot="previous" aria-label="Previous month">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </Button>
              <h3>
                {new Intl.DateTimeFormat("en-IN", {
                  month: "long",
                  year: "numeric",
                }).format(
                  new Date(`${state.visibleRange.start.toString()}T00:00:00Z`),
                )}
              </h3>
              <Button slot="next" aria-label="Next month">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Button>
            </div>
            <CalendarGrid className="guest-calendar-grid" weekdayStyle="short">
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell date={date} className="guest-date-cell" />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </>
        )}
      </RangeCalendar>
      <details
        className="guest-date-picker__manual"
        open={manual}
        onToggle={(event) =>
          setManual((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>Enter dates instead</summary>
        <div className="guest-date-picker__inputs">
          <label>
            Check-in
            <input
              type="date"
              value={draft.checkIn}
              min={resortToday()}
              max={MAX_CHECK_OUT_DATE}
              onChange={(e) =>
                setDraftValue({ ...draft, checkIn: e.target.value })
              }
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={draft.checkOut}
              min={resortToday()}
              max={MAX_CHECK_OUT_DATE}
              onChange={(e) =>
                setDraftValue({ ...draft, checkOut: e.target.value })
              }
            />
          </label>
        </div>
      </details>
      {error && (
        <p className="guest-date-picker__error" role="alert">
          {error}
        </p>
      )}
      <div className="guest-date-picker__actions">
        <Button
          onPress={() => {
            setDraft({ checkIn, checkOut });
            setError("");
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button className="guest-date-picker__apply" onPress={apply}>
          Apply dates
        </Button>
      </div>
    </Dialog>
  );
  return (
    <div className="guest-date-picker">
      <DialogTrigger
        isOpen={open}
        onOpenChange={(next) => {
          if (next) {
            setDraft({ checkIn, checkOut });
            setError("");
          }
          setOpen(next);
        }}
      >
        <Button
          className="guest-date-picker__trigger"
          isDisabled={disabled}
          aria-label="Choose check-in and check-out dates"
        >
          <span>
            <small>Check-in</small>
            <strong>{readable(checkIn)}</strong>
          </span>
          <span className="guest-date-picker__separator" aria-hidden="true" />
          <span>
            <small>Check-out</small>
            <strong>{readable(checkOut)}</strong>
          </span>
        </Button>
        {compact ? (
          <ModalOverlay className="guest-date-picker__overlay" isDismissable>
            <Modal className="guest-date-picker__modal">{content}</Modal>
          </ModalOverlay>
        ) : (
          <Popover
            className="guest-date-picker__popover"
            placement="bottom start"
            offset={8}
          >
            {content}
          </Popover>
        )}
      </DialogTrigger>
    </div>
  );
}
