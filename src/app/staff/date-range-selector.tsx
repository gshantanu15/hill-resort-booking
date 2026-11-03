"use client";

import { useState } from "react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { Button } from "react-aria-components/Button";
import { Dialog, DialogTrigger } from "react-aria-components/Dialog";
import { Modal, ModalOverlay } from "react-aria-components/Modal";
import { Popover } from "react-aria-components/Popover";
import {
  RangeCalendar,
  CalendarGrid,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarGridBody,
  CalendarCell,
} from "react-aria-components/RangeCalendar";
import {
  addStayDays,
  formatStayDate,
  formatStayRange,
  stayNights,
  type CalendarRange,
} from "@/lib/staff-calendar";
import StaffIcon from "./staff-icon";

type Props = {
  range: CalendarRange;
  today: string;
  compact: boolean;
  busy: boolean;
  onApply: (range: CalendarRange) => Promise<boolean>;
};

export default function DateRangeSelector({
  range,
  today,
  compact,
  busy,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const [focusedDate, setFocusedDate] = useState<CalendarDate>(
    parseDate(range.start),
  );
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  let selection = null;
  try {
    selection = { start: parseDate(draft.start), end: parseDate(draft.end) };
    if (selection.start.compare(selection.end) > 0) selection = null;
  } catch {
    /* Typed date fields may be incomplete. */
  }
  const count = stayNights(range).length;

  function choose(next: CalendarRange) {
    setDraft(next);
    setFocusedDate(parseDate(next.start));
    setError("");
  }
  async function apply() {
    try {
      stayNights(draft);
    } catch {
      setError("Choose between 1 and 31 stay nights, including both dates.");
      return;
    }
    setApplying(true);
    setError("");
    try {
      if (await onApply(draft)) setOpen(false);
      else
        setError(
          "The nights could not load. Your current calendar and edits are unchanged. Try again.",
        );
    } finally {
      setApplying(false);
    }
  }
  const content = (
    <Dialog className="staff-picker" aria-labelledby="stay-picker-title">
      <div className="staff-picker-title">
        <h2 id="stay-picker-title">Choose stay nights</h2>
        <Button
          className="staff-quiet-button"
          onPress={() => setOpen(false)}
          isDisabled={applying}
          aria-label="Close date picker"
        >
          <StaffIcon name="close" />
        </Button>
      </div>
      <div className="staff-range-presets">
        {[7, 14].map((nights) => (
          <Button
            key={nights}
            className="staff-button"
            isDisabled={applying}
            onPress={() =>
              choose({ start: today, end: addStayDays(today, nights - 1) })
            }
          >
            {nights} nights
          </Button>
        ))}
        <Button
          className="staff-button"
          isDisabled={applying}
          onPress={() => {
            const first = parseDate(draft.start || range.start).set({ day: 1 });
            choose({
              start: first.toString(),
              end: first.add({ months: 1 }).subtract({ days: 1 }).toString(),
            });
          }}
        >
          Whole month
        </Button>
      </div>
      <RangeCalendar
        autoFocus
        className="staff-range-calendar"
        aria-label="Stay nights"
        value={selection}
        focusedValue={focusedDate}
        onFocusChange={setFocusedDate}
        onChange={(next) => {
          setDraft({ start: next.start.toString(), end: next.end.toString() });
          setError("");
        }}
        visibleDuration={{ months: compact ? 1 : 2 }}
        pageBehavior="single"
        firstDayOfWeek="mon"
        isDisabled={applying}
      >
        {({ state }) => (
          <>
            <div className="staff-month-nav">
              <Button
                slot="previous"
                className="staff-quiet-button"
                aria-label="Previous month"
              >
                <StaffIcon name="previous" />
              </Button>
              <h3>
                {formatStayDate(state.visibleRange.start.toString(), {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              {!compact && (
                <h3>
                  {formatStayDate(
                    state.visibleRange.start.add({ months: 1 }).toString(),
                    { month: "long", year: "numeric" },
                  )}
                </h3>
              )}
              <Button
                slot="next"
                className="staff-quiet-button"
                aria-label="Next month"
              >
                <StaffIcon name="next" />
              </Button>
            </div>
            <div className="staff-month-grids">
              {Array.from({ length: compact ? 1 : 2 }, (_, offset) => (
                <CalendarGrid
                  key={offset}
                  offset={{ months: offset }}
                  weekdayStyle="short"
                >
                  <CalendarGridHeader>
                    {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(date) => (
                      <CalendarCell date={date} className="staff-date-cell" />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              ))}
            </div>
          </>
        )}
      </RangeCalendar>
      <details className="staff-manual-dates">
        <summary>Enter dates instead</summary>
        <div className="staff-range-entry">
          <label htmlFor="staff-range-start">
            First stay night
            <input
              id="staff-range-start"
              name="start"
              type="date"
              value={draft.start}
              disabled={applying}
              onChange={(event) => {
                setDraft((value) => ({ ...value, start: event.target.value }));
                setError("");
              }}
            />
          </label>
          <label htmlFor="staff-range-end">
            Last stay night
            <input
              id="staff-range-end"
              name="end"
              type="date"
              value={draft.end}
              disabled={applying}
              onChange={(event) => {
                setDraft((value) => ({ ...value, end: event.target.value }));
                setError("");
              }}
            />
          </label>
        </div>
      </details>
      {error && (
        <p className="staff-picker-error" role="alert">
          {error}
        </p>
      )}
      <div className="staff-picker-foot">
        <p>Both nights included. Up to 31 nights.</p>
        <Button
          className="staff-button staff-button-primary"
          onPress={() => void apply()}
          isDisabled={applying}
        >
          {applying ? "Loading…" : "Show nights"}
        </Button>
      </div>
    </Dialog>
  );
  return (
    <DialogTrigger
      isOpen={open}
      onOpenChange={(next) => {
        if (applying) return;
        if (next) {
          choose(range);
        }
        setOpen(next);
      }}
    >
      <Button
        className="staff-button staff-range-trigger"
        isDisabled={busy}
        aria-label="Choose stay nights"
      >
        <span className="staff-range-copy">
          <StaffIcon name="calendar" />
          <span className="staff-range-text">
            <span>{formatStayRange(range)}</span>
            <small>
              {count} stay {count === 1 ? "night" : "nights"}
            </small>
          </span>
        </span>
        <StaffIcon name="chevron" />
      </Button>
      {compact ? (
        <ModalOverlay className="staff-date-overlay" isDismissable={!applying}>
          <Modal className="staff-date-modal">{content}</Modal>
        </ModalOverlay>
      ) : (
        <Popover
          className="staff-date-popover"
          placement="bottom start"
          offset={8}
          isKeyboardDismissDisabled={applying}
        >
          {content}
        </Popover>
      )}
    </DialogTrigger>
  );
}
