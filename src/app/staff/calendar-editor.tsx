"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import StaffNavigation from "./staff-navigation";
import {
  formatPaise,
  parsePricePaise,
  validateInventoryPatch,
} from "@/lib/staff-inventory";
import {
  addStayDays,
  formatStayDate,
  inventoryRange,
  nightKey,
  stayNights,
  type CalendarRange,
  type CalendarRow,
} from "@/lib/staff-calendar";
import DateRangeSelector from "./date-range-selector";
import StaffIcon from "./staff-icon";

type Draft = {
  price: string;
  allotment: string;
  blackout: boolean;
  roomName: string;
  roomTypeId: string;
  stayDate: string;
};
const draftFor = (row: CalendarRow): Draft => ({
  price: formatPaise(row.pricePaise),
  allotment: String(row.allotment),
  blackout: row.blackout,
  roomName: row.roomName,
  roomTypeId: row.roomTypeId,
  stayDate: row.stayDate,
});
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
const weekend = (day: string) =>
  [5, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());

async function readInventory(
  range: CalendarRange,
  signal?: AbortSignal,
): Promise<CalendarRow[]> {
  const query = inventoryRange(range);
  const response = await fetch(
    `/api/staff/inventory?start=${query.start}&end=${query.end}`,
    { cache: "no-store", signal },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Unable to load calendar.");
  return body.rows;
}
const mobileQuery = "(max-width: 700px)";
function subscribeToSize(notify: () => void) {
  const media = matchMedia(mobileQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export default function CalendarEditor({
  initialRange,
  today,
  initialRoom = "all",
}: {
  initialRange: CalendarRange;
  today: string;
  initialRoom?: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState(initialRange);
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [filter, setFilter] = useState(initialRoom);
  const [page, setPage] = useState(0);
  const [mobileDay, setMobileDay] = useState(initialRange.start);
  const compact = useSyncExternalStore(
    subscribeToSize,
    () => matchMedia(mobileQuery).matches,
    () => false,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"price" | "allotment" | null>(
    null,
  );
  const priceRef = useRef<HTMLInputElement>(null);
  const allotmentRef = useRef<HTMLInputElement>(null);
  const allDates = stayNights(range);
  const dates = allDates.slice(page * 7, page * 7 + 7);
  const pages = Math.ceil(allDates.length / 7);
  const rooms = [
    ...new Map(
      rows.map((row) => [
        row.roomTypeId,
        { id: row.roomTypeId, name: row.roomName, limit: row.websiteLimit },
      ]),
    ).values(),
  ];
  const roomFilter = rooms.some((room) => room.id === filter) ? filter : "all";
  const selected = rows.find((row) => nightKey(row) === selectedKey);
  const draft = selected ? (drafts[selectedKey] ?? draftFor(selected)) : null;
  const rowMap = new Map(rows.map((row) => [nightKey(row), row]));
  const unsaved = Object.keys(drafts).length;

  const acceptInventory = useCallback(
    (nextRows: CalendarRow[], next: CalendarRange, preservePage = false) => {
      setRows(nextRows);
      setRange(next);
      setLoaded(true);
      if (!preservePage) setPage(0);
      setMobileDay((previous) =>
        preservePage && previous >= next.start && previous <= next.end
          ? previous
          : next.start,
      );
      setSelectedKey((previous) => {
        if (preservePage && nextRows.some((row) => nightKey(row) === previous))
          return previous;
        const first =
          nextRows.find((row) => row.roomTypeId === "garden-room") ??
          nextRows[0];
        return first ? nightKey(first) : "";
      });
    },
    [],
  );
  const load = useCallback(
    async (next: CalendarRange, preservePage = false) => {
      try {
        const nextRows = await readInventory(next);
        acceptInventory(nextRows, next, preservePage);
        return true;
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load calendar.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [acceptInventory],
  );

  function beginLoad(next: CalendarRange, preservePage = false) {
    setBusy(true);
    setError("");
    setFieldError(null);
    return load(next, preservePage);
  }

  useEffect(() => {
    const controller = new AbortController();
    readInventory(initialRange, controller.signal)
      .then((nextRows) => {
        if (!controller.signal.aborted) acceptInventory(nextRows, initialRange);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load calendar.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [initialRange, acceptInventory]);
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    params.set("from", range.start);
    params.set("to", range.end);
    if (roomFilter === "all") params.delete("room");
    else params.set("room", roomFilter);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`,
    );
  }, [range, roomFilter, loaded]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function select(row: CalendarRow) {
    setSelectedKey(nightKey(row));
    setMobileDay(row.stayDate);
    setFieldError(null);
    if (compact) {
      setEditorOpen(true);
      requestAnimationFrame(() => priceRef.current?.focus());
    }
  }
  function updateDraft(change: Partial<Draft>) {
    if (!selected || !draft) return;
    const next = { ...draft, ...change };
    const original = draftFor(selected);
    setDrafts((previous) => {
      const updated = { ...previous };
      if (
        next.price === original.price &&
        next.allotment === original.allotment &&
        next.blackout === original.blackout
      )
        delete updated[selectedKey];
      else updated[selectedKey] = next;
      return updated;
    });
    setMessage("");
    setFieldError(null);
  }
  async function save() {
    if (!selected || !draft || busy) return;
    setMessage("");
    setError("");
    setFieldError(null);
    let pricePaise: number;
    try {
      pricePaise = parsePricePaise(draft.price);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Enter a valid price.",
      );
      setFieldError("price");
      priceRef.current?.focus();
      return;
    }
    const allotment = draft.allotment === "" ? NaN : Number(draft.allotment);
    if (
      !Number.isInteger(allotment) ||
      allotment < selected.booked ||
      allotment > selected.websiteLimit
    ) {
      setError(
        `Allotment must be a whole number between ${selected.booked} booked rooms and the website ceiling of ${selected.websiteLimit}.`,
      );
      setFieldError("allotment");
      allotmentRef.current?.focus();
      return;
    }
    let payload;
    try {
      payload = validateInventoryPatch({
        roomTypeId: selected.roomTypeId,
        stayDate: selected.stayDate,
        ratePlanId: "standard-stay",
        pricePaise,
        allotment,
        blackout: draft.blackout,
      });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Enter a valid rate.",
      );
      setFieldError("price");
      priceRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/staff/inventory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save.");
      setRows((previous) =>
        previous.map((row) =>
          nightKey(row) === selectedKey
            ? { ...row, pricePaise, allotment, blackout: draft.blackout }
            : row,
        ),
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[selectedKey];
        return next;
      });
      setMessage(`Saved ${selected.roomName} for ${selected.stayDate}.`);
      const refreshed = await load(range, true);
      if (!refreshed)
        setError(
          "The night was saved, but the calendar could not refresh. Refresh before making another change.",
        );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (unsaved && !window.confirm("Discard unsaved night edits and sign out?"))
      return;
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
      setBusy(false);
    }
  }
  function showDay(day: string) {
    const index = allDates.indexOf(day);
    if (index < 0) return;
    setMobileDay(day);
    setPage(Math.floor(index / 7));
    const next =
      rows.find(
        (row) =>
          row.stayDate === day &&
          row.roomTypeId ===
            (roomFilter === "all" ? selected?.roomTypeId : roomFilter),
      ) ??
      rows.find(
        (row) =>
          row.stayDate === day &&
          (roomFilter === "all" || row.roomTypeId === roomFilter),
      );
    setSelectedKey(next ? nightKey(next) : "");
    setFieldError(null);
  }
  async function applyRange(next: CalendarRange) {
    setMessage("");
    return beginLoad(next);
  }

  async function reviewDraft(key: string, pending: Draft) {
    if (busy) return;
    if (!allDates.includes(pending.stayDate)) {
      if (
        !(await beginLoad({
          start: pending.stayDate,
          end: addStayDays(pending.stayDate, 6),
        }))
      )
        return;
    } else setPage(Math.floor(allDates.indexOf(pending.stayDate) / 7));
    setSelectedKey(key);
    setMobileDay(pending.stayDate);
    setFieldError(null);
    if (compact) {
      setEditorOpen(true);
      requestAnimationFrame(() => priceRef.current?.focus());
    }
  }

  return (
    <>
      <a className="skip" href="#staff-main">
        Skip to content
      </a>
      <StaffNavigation
        current="calendar"
        busy={busy}
        onSignOut={() => void signOut()}
        beforeNavigate={() =>
          !unsaved ||
          window.confirm("Discard unsaved night edits and leave the calendar?")
        }
      />
      <main id="staff-main" className="staff-container staff-workspace">
        <div className="staff-page-intro">
          <div>
            <h1>Rates &amp; availability</h1>
            <p>Set nightly rates, allotments and blackouts.</p>
          </div>
          <p className="staff-timezone">All dates in Asia/Kolkata</p>
        </div>
        <div className="staff-toolbar">
          <div className="staff-date-tools">
            <button
              type="button"
              className="staff-button staff-icon-button"
              disabled={busy}
              aria-label="Previous date range"
              onClick={() =>
                void applyRange({
                  start: addStayDays(range.start, -7),
                  end: addStayDays(range.end, -7),
                })
              }
            >
              <StaffIcon name="previous" />
            </button>
            <DateRangeSelector
              range={range}
              today={today}
              compact={compact}
              busy={busy}
              onApply={applyRange}
            />
            <button
              type="button"
              className="staff-button staff-icon-button"
              disabled={busy}
              aria-label="Next date range"
              onClick={() =>
                void applyRange({
                  start: addStayDays(range.start, 7),
                  end: addStayDays(range.end, 7),
                })
              }
            >
              <StaffIcon name="next" />
            </button>
            <button
              type="button"
              className="staff-quiet-button staff-today"
              disabled={busy}
              onClick={() =>
                void applyRange({ start: today, end: addStayDays(today, 6) })
              }
            >
              Today
            </button>
          </div>
          <div className="staff-toolbar-end">
            <label className="staff-select-wrap" htmlFor="room-filter">
              Room type
              <select
                id="room-filter"
                disabled={busy}
                value={roomFilter}
                onChange={(event) => {
                  const id = event.target.value;
                  setFilter(id);
                  const row =
                    rows.find(
                      (row) =>
                        row.roomTypeId === id && row.stayDate === mobileDay,
                    ) ?? rows.find((row) => row.roomTypeId === id);
                  if (row) setSelectedKey(nightKey(row));
                  setFieldError(null);
                }}
              >
                <option value="all">All rooms</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="staff-quiet-button"
              disabled={busy}
              onClick={() => {
                setMessage("");
                void beginLoad(range, true);
              }}
            >
              <StaffIcon name="refresh" />
              Refresh
            </button>
          </div>
        </div>
        {message && (
          <p className="staff-save-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p
            className="staff-calendar-error"
            id="staff-calendar-error"
            role="alert"
          >
            {error}
            {loaded &&
              " Your loaded calendar and other unsaved edits remain available."}
          </p>
        )}
        <div className="staff-ledger-layout">
          <section
            className="staff-calendar-region"
            aria-label="Nightly rates calendar"
            aria-busy={busy}
          >
            <div className="staff-ledger-meta">
              <p>
                {allDates.length} stay{" "}
                {allDates.length === 1 ? "night" : "nights"}. Rates include GST.
              </p>
              {unsaved > 0 ? (
                <details className="staff-unsaved">
                  <summary>
                    {unsaved} unsaved {unsaved === 1 ? "night" : "nights"}
                  </summary>
                  <ul>
                    {Object.entries(drafts).map(([key, pending]) => (
                      <li key={key}>
                        <span>
                          {pending.roomName}
                          <small>
                            {formatStayDate(pending.stayDate, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </small>
                        </span>
                        <button
                          className="staff-quiet-button"
                          type="button"
                          disabled={busy}
                          aria-label={`Review unsaved night ${pending.roomName}, ${pending.stayDate}`}
                          onClick={(event) => {
                            const menu = event.currentTarget.closest("details");
                            if (menu) menu.open = false;
                            void reviewDraft(key, pending);
                          }}
                        >
                          Open
                        </button>
                        <button
                          className="staff-quiet-button"
                          type="button"
                          disabled={busy}
                          aria-label={`Discard edits for ${pending.roomName}, ${pending.stayDate}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Discard unsaved edits for ${pending.roomName} on ${pending.stayDate}?`,
                              )
                            )
                              setDrafts((previous) => {
                                const next = { ...previous };
                                delete next[key];
                                return next;
                              });
                          }}
                        >
                          <StaffIcon name="close" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <span className="staff-weekend-legend">
                  <span aria-hidden="true" />
                  Friday &amp; Saturday
                </span>
              )}
            </div>
            <div className="staff-mobile-day-tools">
              <button
                type="button"
                className="staff-quiet-button"
                aria-label="Previous night"
                disabled={busy || mobileDay === range.start}
                onClick={() => showDay(addStayDays(mobileDay, -1))}
              >
                <StaffIcon name="previous" />
              </button>
              <span>
                {formatStayDate(mobileDay, {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <button
                type="button"
                className="staff-quiet-button"
                aria-label="Next night"
                disabled={busy || mobileDay === range.end}
                onClick={() => showDay(addStayDays(mobileDay, 1))}
              >
                <StaffIcon name="next" />
              </button>
              <button
                type="button"
                className="staff-quiet-button staff-mobile-edit"
                disabled={busy || !selected}
                onClick={() => selected && select(selected)}
              >
                Edit
              </button>
            </div>
            {busy && !loaded ? (
              <div className="staff-state-panel" aria-label="Loading calendar">
                <p>Loading nights…</p>
                {[1, 2, 3].map((value) => (
                  <div
                    className="staff-skeleton"
                    aria-hidden="true"
                    key={value}
                  />
                ))}
              </div>
            ) : rows.length ? (
              <>
                <table className="staff-rate-table">
                  <caption className="sr-only">
                    Tax-inclusive nightly rates and allotment. Select a
                    configured room night to edit; booked counts and limits are
                    read-only.
                  </caption>
                  <thead>
                    <tr>
                      <th className="staff-room-column" scope="col">
                        Room type
                      </th>
                      {dates.map((day) => (
                        <th
                          key={day}
                          scope="col"
                          className={weekend(day) ? "staff-weekend" : ""}
                        >
                          {formatStayDate(day, { weekday: "short" })}
                          <span>{Number(day.slice(-2))}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms
                      .filter(
                        (room) =>
                          roomFilter === "all" || room.id === roomFilter,
                      )
                      .map((room) => (
                        <tr key={room.id}>
                          <th scope="row">
                            {room.name}
                            <span>Website limit {room.limit}</span>
                          </th>
                          {dates.map((day) => {
                            const row = rowMap.get(`${room.id}:${day}`);
                            const key = row ? nightKey(row) : "";
                            return (
                              <td
                                key={day}
                                className={`${weekend(day) ? "staff-weekend " : ""}${day === mobileDay ? "staff-mobile-current" : ""}`}
                              >
                                {row ? (
                                  <button
                                    type="button"
                                    data-testid={`night-${row.roomTypeId}-${day}`}
                                    className="staff-night"
                                    aria-pressed={selectedKey === key}
                                    disabled={busy}
                                    aria-label={`Edit ${room.name}, ${day}, ${money(row.pricePaise)}, ${row.allotment} allotted, ${row.booked} booked${row.blackout ? ", blackout" : ""}`}
                                    onClick={() => select(row)}
                                  >
                                    <span className="staff-night-price">
                                      {money(row.pricePaise)}
                                    </span>
                                    <span className="staff-night-stock">
                                      {row.blackout ? (
                                        <span className="staff-night-closed">
                                          Blackout
                                        </span>
                                      ) : (
                                        `${row.allotment} allotted`
                                      )}
                                    </span>
                                    {drafts[key] && (
                                      <span className="staff-night-draft">
                                        Unsaved
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="staff-not-configured">
                                    Not configured
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="staff-table-foot">
                  <p>Select a night to edit its rate and stock.</p>
                  {pages > 1 && (
                    <div className="staff-week-pages">
                      <button
                        type="button"
                        className="staff-quiet-button"
                        disabled={busy || page === 0}
                        aria-label="Previous week in range"
                        onClick={() => showDay(allDates[(page - 1) * 7])}
                      >
                        <StaffIcon name="previous" />
                      </button>
                      <span>
                        Week {page + 1} of {pages}
                      </span>
                      <button
                        type="button"
                        className="staff-quiet-button"
                        disabled={busy || page === pages - 1}
                        aria-label="Next week in range"
                        onClick={() => showDay(allDates[(page + 1) * 7])}
                      >
                        <StaffIcon name="next" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="staff-state-panel">
                <h2>
                  {error ? "Calendar could not load" : "No configured nights"}
                </h2>
                <p>
                  {error
                    ? "Try loading the calendar again."
                    : "No rates or inventory are configured in this range. Choose another date range."}
                </p>
                <button
                  type="button"
                  className="staff-button"
                  disabled={busy}
                  onClick={() => void beginLoad(range)}
                >
                  Try again
                </button>
              </div>
            )}
          </section>
          <details
            className="staff-editor-details"
            open={!compact || editorOpen}
            onToggle={(event) => {
              if (compact) setEditorOpen(event.currentTarget.open);
            }}
          >
            <summary>
              Edit selected night{" "}
              <span>{selected?.roomName ?? "Choose a night"}</span>
            </summary>
            <aside
              className="staff-night-editor"
              aria-labelledby="staff-editor-title"
            >
              <div>
                <h2 id="staff-editor-title">
                  {selected?.roomName ?? "Select a night"}
                </h2>
                {selected && (
                  <p className="staff-editor-date">
                    {formatStayDate(selected.stayDate, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {selected && draft ? (
                <form
                  className="staff-night-form"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                >
                  <div className="staff-field">
                    <label htmlFor={`price-${selectedKey}`}>
                      Nightly rate, including GST
                    </label>
                    <div className="staff-input-suffix">
                      <input
                        ref={priceRef}
                        id={`price-${selectedKey}`}
                        name="price"
                        inputMode="decimal"
                        autoComplete="off"
                        value={draft.price}
                        disabled={busy}
                        aria-invalid={fieldError === "price" || undefined}
                        aria-describedby={
                          fieldError === "price"
                            ? "staff-calendar-error"
                            : "staff-price-help"
                        }
                        onChange={(event) =>
                          updateDraft({ price: event.target.value })
                        }
                      />
                      <span>INR</span>
                    </div>
                    <p id="staff-price-help" className="staff-field-helper">
                      Per room, per night
                    </p>
                  </div>
                  <div className="staff-field">
                    <label htmlFor={`allotment-${selectedKey}`}>
                      Website allotment
                    </label>
                    <input
                      ref={allotmentRef}
                      id={`allotment-${selectedKey}`}
                      name="allotment"
                      type="number"
                      min={selected.booked}
                      max={selected.websiteLimit}
                      step="1"
                      value={draft.allotment}
                      disabled={busy}
                      aria-invalid={fieldError === "allotment" || undefined}
                      aria-describedby={
                        fieldError === "allotment"
                          ? "staff-calendar-error"
                          : "staff-allotment-help"
                      }
                      onChange={(event) =>
                        updateDraft({ allotment: event.target.value })
                      }
                    />
                    <p className="staff-field-helper" id="staff-allotment-help">
                      Between {selected.booked} booked and the limit of{" "}
                      {selected.websiteLimit}
                    </p>
                  </div>
                  <dl className="staff-inventory-facts">
                    <div>
                      <dt>Booked</dt>
                      <dd>{selected.booked}</dd>
                    </div>
                    <div>
                      <dt>Website limit</dt>
                      <dd>{selected.websiteLimit}</dd>
                    </div>
                  </dl>
                  <div className="staff-blackout-row">
                    <label htmlFor={`blackout-${selectedKey}`}>
                      Blackout this night<small>Stops new sales only</small>
                    </label>
                    <input
                      className="staff-switch"
                      id={`blackout-${selectedKey}`}
                      name="blackout"
                      type="checkbox"
                      role="switch"
                      checked={draft.blackout}
                      disabled={busy}
                      onChange={(event) =>
                        updateDraft({ blackout: event.target.checked })
                      }
                    />
                  </div>
                  <div className="staff-editor-actions">
                    <button
                      className="staff-button staff-button-primary"
                      disabled={busy}
                      type="submit"
                    >
                      {busy ? "Please wait…" : "Save night"}
                    </button>
                    <button
                      className="staff-quiet-button"
                      disabled={busy || !drafts[selectedKey]}
                      type="button"
                      aria-label="Reset this night"
                      title="Reset this night"
                      onClick={() => {
                        setDrafts((previous) => {
                          const next = { ...previous };
                          delete next[selectedKey];
                          return next;
                        });
                        setFieldError(null);
                        setError("");
                        setMessage("");
                      }}
                    >
                      <StaffIcon name="refresh" />
                    </button>
                  </div>
                  <p className="staff-editor-helper">
                    {drafts[selectedKey]
                      ? "Unsaved edits for this night."
                      : "Changes apply to this night only."}
                  </p>
                </form>
              ) : (
                <p className="staff-editor-helper">
                  Choose a configured room night in the calendar.
                </p>
              )}
            </aside>
          </details>
        </div>
        <div className="staff-policy-note">
          <StaffIcon name="shield" />
          <p>
            Existing bookings keep their confirmed prices. Allotment cannot fall
            below booked stock or exceed the website limit.
          </p>
        </div>
      </main>
    </>
  );
}
