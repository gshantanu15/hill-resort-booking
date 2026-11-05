"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StaffNavigation from "../staff-navigation";
import Link from "next/link";
import { Button } from "react-aria-components/Button";
import { Tabs, TabList, Tab, TabPanel } from "react-aria-components/Tabs";
import { Dialog, DialogTrigger } from "react-aria-components/Dialog";
import { Popover } from "react-aria-components/Popover";
import { Modal, ModalOverlay } from "react-aria-components/Modal";
import EnquiryIcon from "./enquiry-icon";
import EnquiryChoice from "./enquiry-choice";
import { EnquiryRoutingEditor, EnquiryDraftEditor } from "./enquiry-editors";
import { simulatedEnquiryInputSchema } from "@/lib/enquiry-validation";

type Row = {
  id: string;
  contactName: string;
  source: string;
  category: string;
  owner: string | null;
  needsReview: boolean;
  gmAttention: boolean;
  processingState: string;
  createdAt: string;
  preview: string;
};
type Detail = {
  id: string;
  source: string;
  contact: { name: string; email: string; phone: string | null };
  message: string;
  category: string;
  owner: string | null;
  needsReview: boolean;
  gmAttention: boolean;
  processingState: string;
  draft: string | null;
  createdAt: string;
  extracted: null;
};
type SimPayload = {
  submissionId: string;
  source: "email" | "whatsapp";
  contact: { name: string; email: string; phone?: string };
  message: string;
};
const pendingKey = "aavana.pending-staff-enquiry.v1";
const sources = ["website", "email", "whatsapp"] as const;
const categories = ["unsorted", "room", "wedding", "offsite", "complaint"];
const owners = ["unassigned", "reservations", "sales", "gm"];
const readable = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1).replaceAll("_", " ") : "";
const fullDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
const queueDate = (value: string) => {
  const date = new Date(value),
    day = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  return day.format(date) === day.format(new Date())
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }).format(date)
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      }).format(date);
};
const channelIcon = (value: string): "website" | "email" | "whatsapp" =>
  value === "email" ? "email" : value === "whatsapp" ? "whatsapp" : "website";
const ownerLabel = (owner: string | null) =>
  owner === "gm"
    ? "GM"
    : owner
      ? owner[0].toUpperCase() + owner.slice(1)
      : "Unassigned";
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new HttpError(
      401,
      "Your staff session has ended. Please sign in again.",
    );
  }
  if (res.status === 403)
    throw new HttpError(403, "Staff access is required for this workspace.");
  if (!res.ok)
    throw new HttpError(
      res.status,
      body?.error || "Enquiry service unavailable. Please try again.",
    );
  return body;
}
export default function EnquiryInbox() {
  const router = useRouter();
  const params = useSearchParams();
  const [lane, setLane] = useState(
    params.get("attention") === "gm"
      ? "gm"
      : params.get("review") === "needs-review"
        ? "review"
        : "all",
  );
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("message");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const focusDetail = useRef(false);
  const [rows, setRows] = useState<Row[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [source, setSource] = useState(
      sources.some((s) => s === params.get("source"))
        ? params.get("source")!
        : "",
    ),
    [category, setCategory] = useState(
      categories.includes(params.get("category") ?? "")
        ? params.get("category")!
        : "",
    ),
    [owner, setOwner] = useState(
      owners.includes(params.get("owner") ?? "") ? params.get("owner")! : "",
    ),
    [page, setPage] = useState(() => {
      const n = Number(params.get("page") ?? 1);
      return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
    }),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      message: "",
    }),
    [simSource, setSimSource] = useState<"email" | "whatsapp">("email"),
    [busy, setBusy] = useState(false),
    [simError, setSimError] = useState(""),
    [simSuccess, setSimSuccess] = useState("");
  const lock = useRef(false);
  const listRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openedBy = useRef<HTMLButtonElement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const pending = useRef<SimPayload | null>(null);
  const [pendingPayload, setPendingPayload] = useState<SimPayload | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const edits = useRef({
    routing: false,
    draft: false,
    routingBusy: false,
    draftBusy: false,
  });
  const canLeave = useCallback(() => {
    if (edits.current.routingBusy || edits.current.draftBusy) {
      window.alert("Wait for the enquiry save to finish before leaving.");
      return false;
    }
    if (
      (edits.current.routing || edits.current.draft) &&
      !window.confirm("Discard unsaved enquiry changes?")
    )
      return false;
    return true;
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (Object.values(edits.current).some(Boolean)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(pendingKey);
        if (raw) {
          const original = JSON.parse(raw) as SimPayload;
          const parsed = simulatedEnquiryInputSchema.safeParse(original);
          if (parsed.success) {
            const value = original;
            pending.current = value;
            setPendingPayload(value);
            setIntakeOpen(true);
            setSimSource(value.source);
            setForm({
              name: value.contact.name,
              email: value.contact.email,
              phone: value.contact.phone ?? "",
              message: value.message,
            });
          } else sessionStorage.removeItem(pendingKey);
        }
      } catch {
        /* storage unavailable */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const open = useCallback(
    async (id: string, manual = true) => {
      if (manual && !canLeave()) return;
      edits.current = {
        routing: false,
        draft: false,
        routingBusy: false,
        draftBusy: false,
      };
      setSelected(id);
      setTab("message");
      setCopied(false);
      setCopyFallback(false);
      focusDetail.current = manual;
      if (manual) setMobileDetail(true);
      detailRequest.current?.abort();
      const controller = new AbortController();
      detailRequest.current = controller;
      setDetail(null);
      setDetailLoading(true);
      setDetailError("");
      try {
        const body = await json<{ enquiry: Detail }>(
          `/api/staff/enquiries/${id}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setDetail(body.enquiry);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof HttpError && e.status === 401) {
          setRows([]);
          router.replace("/staff/login");
        }
        if (e instanceof HttpError && e.status === 403) setRows([]);
        setDetailError(
          e instanceof HttpError
            ? e.message
            : "Unable to load enquiry. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    },
    [router, canLeave],
  );
  const load = useCallback(async () => {
    edits.current = {
      routing: false,
      draft: false,
      routingBusy: false,
      draftBusy: false,
    };
    listRequest.current?.abort();
    detailRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setDetail(null);
    setDetailLoading(false);
    setDetailError("");
    setRows([]);
    setSelected("");
    setMobileDetail(false);
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page) });
      if (source) q.set("source", source);
      if (category) q.set("category", category);
      if (owner) q.set("owner", owner);
      if (lane === "review") q.set("review", "needs-review");
      if (lane === "gm") q.set("attention", "gm");
      window.history.replaceState(null, "", `/staff/enquiries?${q}`);
      const body = await json<{ rows: Row[]; total: number }>(
        `/api/staff/enquiries?${q}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setRows(body.rows);
      setTotal(body.total);
      if (body.rows[0]) void open(body.rows[0].id, false);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof HttpError && e.status === 401)
        router.replace("/staff/login");
      setTotal(0);
      setError(
        e instanceof HttpError
          ? e.message
          : "Unable to load enquiries. Please try again.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, source, category, owner, lane, router, open]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      listRequest.current?.abort();
      detailRequest.current?.abort();
    };
  }, [load]);
  useEffect(() => {
    if (!detail || !focusDetail.current) return;
    const timer = window.setTimeout(() => {
      if (matchMedia("(max-width:700px)").matches) {
        closeButton.current?.focus();
        closeButton.current?.scrollIntoView({ block: "nearest" });
      } else detailHeading.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [detail]);
  const signOut = async () => {
    if (!canLeave()) return;
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      listRequest.current?.abort();
      detailRequest.current?.abort();
      setRows([]);
      setDetail(null);
      router.replace("/staff/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    }
  };
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (lock.current) return;
    setSimError("");
    setSimSuccess("");
    const payload: SimPayload = pending.current ?? {
      submissionId: crypto.randomUUID(),
      source: simSource,
      contact: {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
      },
      message: form.message,
    };
    const parsed = simulatedEnquiryInputSchema.safeParse(payload);
    if (!parsed.success) {
      setSimError(
        parsed.error.issues[0]?.message || "Check the simulated enquiry.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      try {
        sessionStorage.setItem(pendingKey, JSON.stringify(payload));
      } catch {
        throw new Error(
          "Your browser is blocking temporary storage. Enable site storage, then try again.",
        );
      }
      pending.current = payload;
      setPendingPayload(payload);
      const body = await json<{ reference?: string }>("/api/staff/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      if (!body?.reference || typeof body.reference !== "string")
        throw new Error(
          "The enquiry response was incomplete. Your exact request is saved for retry.",
        );
      setSimSuccess(`Saved ${body.reference}.`);
      pending.current = null;
      setPendingPayload(null);
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* Already saved; cleanup is best effort. */
      }
      setForm({ name: "", email: "", phone: "", message: "" });
      void load();
    } catch (e) {
      if (
        e instanceof HttpError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 401 &&
        e.status !== 403
      ) {
        pending.current = null;
        setPendingPayload(null);
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {
          /* storage may be blocked */
        }
      }
      if (e instanceof HttpError && e.status === 401) {
        setRows([]);
        setDetail(null);
        router.replace("/staff/login");
      }
      if (e instanceof HttpError && e.status === 403) {
        setRows([]);
        setDetail(null);
      }
      setSimError(
        e instanceof HttpError
          ? e.message
          : pending.current
            ? "The enquiry could not be confirmed. Retry the unchanged request."
            : "Unable to save this enquiry. Check that site storage is enabled and try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const resetFilters = () => {
    if (!canLeave()) return;
    setSource("");
    setCategory("");
    setOwner("");
    setLane("all");
    setPage(1);
  };
  const backToQueue = () => {
    setMobileDetail(false);
    requestAnimationFrame(() => openedBy.current?.focus());
  };
  const activeFilters = (category ? 1 : 0) + (owner ? 1 : 0);
  return (
    <div className="ei-app">
      <a className="ei-skip-link" href="#enquiry-main">
        Skip to enquiries
      </a>
      <StaffNavigation
        current="enquiries"
        beforeNavigate={canLeave}
        onSignOut={() => void signOut()}
      />
      <main className="ei-shell" id="enquiry-main">
        <div className="ei-page-heading">
          <div>
            <h1>Enquiries</h1>
            <p>A clear view of every conversation.</p>
          </div>
          <div className="ei-heading-actions">
            <Button
              className="ei-control ei-icon-control"
              aria-label="Refresh inbox"
              isDisabled={loading}
              onPress={() => {
                if (canLeave()) void load();
              }}
            >
              <EnquiryIcon name="refresh" />
            </Button>
            <Button
              className="ei-control"
              onPress={() => {
                if (!canLeave()) return;
                setDetail(null);
                edits.current.routing = false;
                edits.current.draft = false;
                setIntakeOpen(true);
                setSimError("");
                setSimSuccess("");
              }}
            >
              <EnquiryIcon name="plus" />
              Add enquiry
            </Button>
          </div>
        </div>
        <div className="ei-toolbar">
          <div className="ei-lane-tabs" role="group" aria-label="Inbox views">
            {[
              ["all", "All enquiries"],
              ["review", "Needs review"],
              ["gm", "GM attention"],
            ].map(([key, label]) => (
              <Button
                key={key}
                className="ei-lane-tab"
                aria-pressed={lane === key}
                onPress={() => {
                  if (!canLeave()) return;
                  setLane(key);
                  setPage(1);
                }}
              >
                {label}
                {lane === key && !loading && !error && (
                  <span className="ei-tab-count">{total}</span>
                )}
              </Button>
            ))}
          </div>
          <div className="ei-toolbar-filters">
            <EnquiryChoice
              label="Source"
              icon={source ? channelIcon(source) : "inbox"}
              value={source || "all"}
              onChange={(value) => {
                if (!canLeave()) return;
                setSource(value === "all" ? "" : value);
                setPage(1);
              }}
              options={[
                { id: "all", name: "All sources", icon: "inbox" },
                ...sources.map((id) => ({
                  id,
                  name:
                    id === "website"
                      ? "Website"
                      : id === "email"
                        ? "Email"
                        : "WhatsApp",
                  icon: id,
                })),
              ]}
            />
            <DialogTrigger>
              <Button className="ei-control">
                <EnquiryIcon name="filter" />
                Filters{" "}
                {activeFilters > 0 && (
                  <span className="ei-filter-count">{activeFilters}</span>
                )}
              </Button>
              <Popover className="ei-filter-popover">
                <Dialog aria-label="Filter enquiries">
                  <h2>Filter enquiries</h2>
                  <div className="ei-filter-field">
                    <span>Category</span>
                    <EnquiryChoice
                      label="Category"
                      value={category || "all"}
                      onChange={(value) => {
                        if (!canLeave()) return;
                        setCategory(value === "all" ? "" : value);
                        setPage(1);
                      }}
                      options={[
                        { id: "all", name: "All categories" },
                        ...categories.map((id) => ({ id, name: readable(id) })),
                      ]}
                    />
                  </div>
                  <div className="ei-filter-field">
                    <span>Owner</span>
                    <EnquiryChoice
                      label="Owner"
                      value={owner || "all"}
                      onChange={(value) => {
                        if (!canLeave()) return;
                        setOwner(value === "all" ? "" : value);
                        setPage(1);
                      }}
                      options={[
                        { id: "all", name: "All owners" },
                        ...owners.map((id) => ({ id, name: ownerLabel(id) })),
                      ]}
                    />
                  </div>
                  <Button className="ei-text-control" onPress={resetFilters}>
                    Clear filters
                  </Button>
                </Dialog>
              </Popover>
            </DialogTrigger>
          </div>
        </div>
        <div className={`ei-workbench${mobileDetail ? " ei-show-detail" : ""}`}>
          <section
            className="ei-queue"
            aria-label="Enquiry list"
            aria-busy={loading}
          >
            <div className="ei-queue-top">
              <span>
                {loading
                  ? "Loading…"
                  : error
                    ? "Unavailable"
                    : `${total} ${total === 1 ? "enquiry" : "enquiries"}`}
              </span>
              <span>
                Newest first <EnquiryIcon name="chevron" />
              </span>
            </div>
            {loading ? (
              <div className="ei-queue-state" role="status">
                <div className="ei-skeleton" />
                <div className="ei-skeleton ei-skeleton-short" />
                <p>Loading enquiries…</p>
              </div>
            ) : error ? (
              <div className="ei-queue-state" role="alert">
                <EnquiryIcon name="alert" />
                <h2>Unable to load enquiries</h2>
                <p>{error}</p>
                <Button className="ei-control" onPress={() => void load()}>
                  Try again
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="ei-queue-state">
                <EnquiryIcon name="inbox" />
                <h2>No matching enquiries</h2>
                <p>Try another source or clear your filters.</p>
                <Button className="ei-control" onPress={resetFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <ul className="ei-queue-list">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Button
                      className="ei-queue-row"
                      data-selected={row.id === selected || undefined}
                      aria-pressed={row.id === selected}
                      aria-label={`Open enquiry from ${row.contactName}`}
                      onPress={(event) => {
                        openedBy.current = event.target as HTMLButtonElement;
                        void open(row.id);
                      }}
                    >
                      <div className="ei-row-heading">
                        <strong>{row.contactName}</strong>
                        <time
                          dateTime={row.createdAt}
                          title={`${fullDate(row.createdAt)} IST`}
                        >
                          {queueDate(row.createdAt)}
                        </time>
                      </div>
                      <p className="ei-row-preview">{row.preview}</p>
                      <div className="ei-row-meta">
                        <span className="ei-source">
                          <EnquiryIcon name={channelIcon(row.source)} />
                          {row.source === "website"
                            ? "Website"
                            : row.source === "email"
                              ? "Email"
                              : "WhatsApp"}
                        </span>
                        <span>
                          {row.needsReview ? "Needs review" : "Reviewed"}
                        </span>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="ei-queue-footer">
              <span>Times in IST</span>
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / 25))}
              </span>
            </div>
            <nav className="ei-pagination" aria-label="Enquiry pages">
              <Button
                className="ei-control"
                isDisabled={loading || page === 1}
                onPress={() => {
                  if (canLeave()) setPage(page - 1);
                }}
              >
                Previous
              </Button>
              <Button
                className="ei-control"
                isDisabled={loading || page * 25 >= total}
                onPress={() => {
                  if (canLeave()) setPage(page + 1);
                }}
              >
                Next
              </Button>
            </nav>
          </section>
          {detail ? (
            <aside
              className="ei-reader"
              aria-label="Enquiry detail"
              data-enquiry-id={detail.id}
            >
              <div className="ei-reader-toolbar">
                <Button
                  ref={closeButton}
                  className="ei-text-control ei-back"
                  onPress={backToQueue}
                >
                  <EnquiryIcon name="arrow" />
                  Inbox
                </Button>
                <span className="ei-source">
                  <EnquiryIcon name={channelIcon(detail.source)} />
                  {detail.source === "website"
                    ? "Website"
                    : detail.source === "email"
                      ? "Email"
                      : "WhatsApp"}
                  {detail.source !== "website" && (
                    <span className="ei-simulated">Simulated</span>
                  )}
                </span>
                <span className="ei-reference" title={detail.id}>
                  #{detail.id.slice(0, 8)}
                </span>
              </div>
              <div className="ei-reader-scroll">
                <div className="ei-contact-heading">
                  <h2 ref={detailHeading} tabIndex={-1}>
                    {detail.contact.name}
                  </h2>
                  <p>{detail.contact.email}</p>
                </div>
                <div className="ei-status-line">
                  <span className="ei-status-tag">
                    {detail.needsReview ? "Needs review" : "Reviewed"}
                  </span>
                  <span>{readable(detail.category)}</span>
                  {detail.gmAttention && (
                    <span className="ei-attention">
                      <EnquiryIcon name="alert" />
                      GM attention
                    </span>
                  )}
                  <span className="ei-assigned">
                    <EnquiryIcon name="person" />
                    {ownerLabel(detail.owner)}
                  </span>
                </div>
                <EnquiryRoutingEditor
                  key={`routing-${detail.id}`}
                  enquiry={{ ...detail, draft: detail.draft ?? "" }}
                  onDirty={(value) => {
                    edits.current.routing = value;
                  }}
                  onBusy={(value) => {
                    edits.current.routingBusy = value;
                  }}
                  onSaved={(changes) => {
                    const { category, owner, needsReview, gmAttention } =
                      changes;
                    setDetail((current) =>
                      current
                        ? {
                            ...current,
                            category,
                            owner,
                            needsReview,
                            gmAttention,
                          }
                        : current,
                    );
                    setRows((current) =>
                      current.map((row) =>
                        row.id === detail.id ? { ...row, ...changes } : row,
                      ),
                    );
                  }}
                />
                <Tabs
                  className="ei-detail-tabs"
                  selectedKey={tab}
                  onSelectionChange={(key) => setTab(String(key))}
                >
                  <TabList aria-label="Enquiry sections">
                    <Tab id="message">
                      <EnquiryIcon name="message" />
                      Enquiry
                    </Tab>
                    <Tab id="assistant">
                      <EnquiryIcon name="sparkle" />
                      Assistant<span className="ei-not-run">Not analysed</span>
                    </Tab>
                  </TabList>
                  <TabPanel id="message">
                    <div className="ei-message-heading">
                      <h3>Original enquiry</h3>
                      <time dateTime={detail.createdAt}>
                        {fullDate(detail.createdAt)} IST
                      </time>
                    </div>
                    <div className="ei-message-copy">
                      {detail.message
                        .split(/\n\s*\n/)
                        .map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                    <section className="ei-contact-details">
                      <h3>Contact details</h3>
                      <dl>
                        <div>
                          <dt>Email</dt>
                          <dd>{detail.contact.email}</dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>{detail.contact.phone || "Not provided"}</dd>
                        </div>
                      </dl>
                    </section>
                  </TabPanel>
                  <TabPanel id="assistant" shouldForceMount>
                    <div className="ei-assistant-heading">
                      <div>
                        <h3>Enquiry assistance</h3>
                        <p>Review extracted details and prepare a reply.</p>
                      </div>
                      <Button
                        className="ei-control"
                        isDisabled
                        aria-describedby="enquiry-ai-status"
                      >
                        <EnquiryIcon name="sparkle" />
                        Analyse enquiry
                      </Button>
                    </div>
                    <dl className="ei-extraction">
                      <div>
                        <dt>Dates</dt>
                        <dd>Not analysed</dd>
                      </div>
                      <div>
                        <dt>Guests</dt>
                        <dd>Not analysed</dd>
                      </div>
                      <div>
                        <dt>Budget</dt>
                        <dd>Not analysed</dd>
                      </div>
                    </dl>
                    <EnquiryDraftEditor
                      key={`draft-${detail.id}`}
                      enquiry={{ ...detail, draft: detail.draft ?? "" }}
                      onDirty={(value) => {
                        edits.current.draft = value;
                      }}
                      onBusy={(value) => {
                        edits.current.draftBusy = value;
                      }}
                      onSaved={(changes) => {
                        setDetail((current) =>
                          current
                            ? { ...current, draft: changes.draft }
                            : current,
                        );
                      }}
                    />
                    <p className="ei-preview-note" id="enquiry-ai-status">
                      Analysis is not available yet.
                    </p>
                  </TabPanel>
                </Tabs>
              </div>
              <footer className="ei-reader-footer">
                <span>
                  <EnquiryIcon name="clock" />
                  Received {fullDate(detail.createdAt)} IST
                </span>
                <Button
                  className="ei-text-control"
                  aria-label="Copy enquiry reference"
                  onPress={async () => {
                    try {
                      await navigator.clipboard.writeText(detail.id);
                      setCopied(true);
                      setCopyFallback(false);
                    } catch {
                      setCopied(false);
                      setCopyFallback(true);
                    }
                  }}
                >
                  <EnquiryIcon name="copy" />
                  {copied ? "Copied" : "Copy reference"}
                </Button>
                {copyFallback && (
                  <label className="ei-copy-fallback">
                    Select and copy your reference
                    <input
                      aria-label="Enquiry reference"
                      value={detail.id}
                      readOnly
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                )}
              </footer>
            </aside>
          ) : (
            <section
              className="ei-reader ei-reader-empty"
              aria-label="Enquiry detail"
            >
              <EnquiryIcon name={detailError ? "alert" : "message"} />
              <h2>
                {detailLoading
                  ? "Loading enquiry…"
                  : detailError
                    ? "Unable to load enquiry"
                    : "Select an enquiry"}
              </h2>
              <p>
                {detailError ||
                  "Choose a conversation from the inbox to read its details."}
              </p>
              {detailError && selected && (
                <Button
                  className="ei-control"
                  onPress={() => void open(selected)}
                >
                  Try again
                </Button>
              )}
              {mobileDetail && (
                <Button className="ei-control" onPress={backToQueue}>
                  Inbox
                </Button>
              )}
            </section>
          )}
        </div>
      </main>
      <ModalOverlay
        isOpen={intakeOpen}
        onOpenChange={setIntakeOpen}
        isDismissable={!busy}
        className="ei-modal-overlay"
      >
        <Modal className="ei-intake-modal">
          <Dialog aria-label="Add simulated enquiry" className="enquiry-sim">
            <div className="ei-dialog-heading">
              <h2>Add simulated enquiry</h2>
              <Button
                className="ei-control ei-icon-control"
                aria-label="Close intake"
                isDisabled={busy}
                onPress={() => setIntakeOpen(false)}
              >
                <EnquiryIcon name="close" />
              </Button>
            </div>
            <p className="ei-preview-note">
              Staff-only simulated email and WhatsApp intake. No message is
              sent.
            </p>
            <form method="post" onSubmit={submit} aria-busy={busy}>
              {pendingPayload && (
                <div className="ei-form-notice" role="alert">
                  <strong>
                    {busy
                      ? "Saving simulated enquiry…"
                      : "Enquiry result not confirmed."}
                  </strong>
                  <span>
                    {busy
                      ? "Please wait."
                      : "Retry the exact request unchanged."}
                  </span>
                  <Button
                    className="ei-control"
                    isDisabled={busy}
                    onPress={() => void submit()}
                  >
                    {busy ? "Retrying…" : "Retry unchanged"}
                  </Button>
                </div>
              )}
              <label>
                Intake source
                <select
                  value={simSource}
                  disabled={busy || Boolean(pendingPayload)}
                  onChange={(event) =>
                    setSimSource(event.target.value as "email" | "whatsapp")
                  }
                >
                  <option value="email">Email (simulated)</option>
                  <option value="whatsapp">WhatsApp (simulated)</option>
                </select>
              </label>
              <label>
                Name
                <input
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={pendingPayload?.contact.name ?? form.name}
                  readOnly={busy || Boolean(pendingPayload)}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={pendingPayload?.contact.email ?? form.email}
                  readOnly={busy || Boolean(pendingPayload)}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label>
                Phone (optional)
                <input
                  name="phone"
                  type="tel"
                  maxLength={32}
                  autoComplete="tel"
                  value={pendingPayload?.contact.phone ?? form.phone}
                  readOnly={busy || Boolean(pendingPayload)}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <label>
                Message
                <textarea
                  name="message"
                  required
                  maxLength={4000}
                  rows={4}
                  value={pendingPayload?.message ?? form.message}
                  readOnly={busy || Boolean(pendingPayload)}
                  onChange={(event) =>
                    setForm({ ...form, message: event.target.value })
                  }
                />
              </label>
              {simError && (
                <p className="ei-form-error" role="alert">
                  {simError}
                </p>
              )}
              {simSuccess && (
                <p className="ei-form-notice" role="status">
                  {simSuccess}
                </p>
              )}
              <div className="ei-form-actions">
                <Button
                  className="ei-control"
                  isDisabled={busy}
                  onPress={() => setIntakeOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="ei-control"
                  type="submit"
                  isDisabled={busy || Boolean(pendingPayload)}
                >
                  {busy ? "Saving…" : "Save simulated enquiry"}
                </Button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
      <noscript>
        <p>
          JavaScript is required to load staff enquiries. You can still return
          to the <Link href="/staff">calendar</Link>.
        </p>
      </noscript>
    </div>
  );
}
