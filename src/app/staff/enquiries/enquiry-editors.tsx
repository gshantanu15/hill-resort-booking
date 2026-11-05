"use client";

import { useEffect, useRef, useState } from "react";
import EnquiryChoice from "./enquiry-choice";
import { defaultEnquiryOwner } from "@/lib/enquiry-validation";
import { z } from "zod";

type Enquiry = {
  id: string;
  category: string;
  owner: string | null;
  needsReview: boolean;
  gmAttention: boolean;
  draft: string;
};
type Changes = {
  category: string;
  owner: string | null;
  needsReview: boolean;
  gmAttention: boolean;
  draft: string;
};
type Props = {
  enquiry: Enquiry;
  onSaved: (changes: Changes) => void;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
};
const categories = ["room", "wedding", "offsite", "complaint", "unsorted"].map(
  (id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }),
);
const owners = [
  { id: "unassigned", name: "Unassigned" },
  { id: "reservations", name: "Reservations" },
  { id: "sales", name: "Sales" },
  { id: "gm", name: "GM" },
];
const changesSchema = z.object({
  category: z.enum(["room", "wedding", "offsite", "complaint", "unsorted"]),
  owner: z.enum(["reservations", "sales", "gm"]).nullable(),
  needsReview: z.boolean(),
  gmAttention: z.boolean(),
  draft: z.string(),
});
async function patch(id: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`/api/staff/enquiries/${id}`, {
      method: body === undefined ? "GET" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error(
      "The save could not be confirmed. Your edits remain here; retry when ready.",
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      (response.status === 401 || response.status === 403
        ? "Your staff session is unavailable. Keep this tab open to preserve your edits and sign in again in another tab."
        : result?.error) ||
        (response.status === 409
          ? "This enquiry changed in another window."
          : "The save could not be completed."),
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const parsed = changesSchema.safeParse(
    body === undefined ? result?.enquiry : result?.changes,
  );
  if (!parsed.success)
    throw new Error(
      "The server returned an incomplete save response. Your edits remain here.",
    );
  return parsed.data;
}
export function EnquiryRoutingEditor({
  enquiry,
  onSaved,
  onDirty,
  onBusy,
}: Props) {
  const [category, setCategory] = useState(enquiry.category),
    [owner, setOwner] = useState(enquiry.owner ?? "unassigned"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [baseline, setBaseline] = useState({
    category: enquiry.category,
    owner: enquiry.owner,
  });
  const [conflict, setConflict] = useState(false);
  const dirty =
    category !== baseline.category ||
    owner !== (baseline.owner ?? "unassigned");
  useEffect(() => {
    const t = window.setTimeout(() => onDirty(dirty), 0);
    return () => window.clearTimeout(t);
  }, [dirty, onDirty]);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const changes = await patch(enquiry.id, {
        action: "route",
        category,
        owner: owner === "unassigned" ? null : owner,
        expected: baseline,
      });
      setBaseline({ category: changes.category, owner: changes.owner });
      setCategory(changes.category);
      setOwner(changes.owner ?? "unassigned");
      onDirty(false);
      setConflict(false);
      onSaved(changes);
      setMessage("Routing saved.");
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      setConflict(status === 409);
      if (status === 409)
        setMessage(
          "This enquiry changed elsewhere. Reload the saved version before replacing your edits.",
        );
      else
        setMessage(
          error instanceof Error
            ? error.message
            : "The save could not be completed.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <section className="ei-editor" aria-label="Routing">
      <h3>Routing</h3>
      <div className="ei-editor-grid">
        <div className="ei-editor-field">
          <span>Category</span>
          <EnquiryChoice
            label="Category"
            value={category}
            isDisabled={busy}
            onChange={(value) => {
              setCategory(value);
              setOwner(
                defaultEnquiryOwner(
                  value as Parameters<typeof defaultEnquiryOwner>[0],
                ),
              );
              onDirty(true);
            }}
            options={categories}
          />
        </div>
        <div className="ei-editor-field">
          <span>Owner</span>
          <EnquiryChoice
            label="Owner"
            value={owner}
            isDisabled={busy}
            onChange={(value) => {
              setOwner(value);
              onDirty(true);
            }}
            options={owners}
          />
        </div>
      </div>
      <div className="ei-editor-actions">
        <button
          className="ei-control"
          type="button"
          onClick={() => {
            setCategory(baseline.category);
            setOwner(baseline.owner ?? "unassigned");
            onDirty(false);
            setMessage("");
          }}
          disabled={busy || !dirty}
        >
          Reset
        </button>
        <button
          className="ei-control"
          type="button"
          onClick={() => void save()}
          disabled={busy || !dirty}
        >
          {busy ? "Saving…" : "Save routing"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {conflict && (
        <button
          type="button"
          className="ei-control"
          disabled={busy}
          onClick={async () => {
            if (
              lock.current ||
              !window.confirm(
                "Discard your unsaved routing and load the saved version?",
              )
            )
              return;
            lock.current = true;
            setBusy(true);
            onBusy(true);
            try {
              const saved = await patch(enquiry.id);
              setBaseline({ category: saved.category, owner: saved.owner });
              setCategory(saved.category);
              setOwner(saved.owner ?? "unassigned");
              onSaved(saved);
              onDirty(false);
              setConflict(false);
              setMessage("Saved routing loaded.");
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to reload. Your changes remain here.",
              );
            } finally {
              lock.current = false;
              setBusy(false);
              onBusy(false);
            }
          }}
        >
          Reload saved routing
        </button>
      )}
    </section>
  );
}
export function EnquiryDraftEditor({
  enquiry,
  onSaved,
  onDirty,
  onBusy,
}: Props) {
  const [draft, setDraft] = useState(enquiry.draft ?? ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [baseline, setBaseline] = useState(enquiry.draft ?? "");
  const [conflict, setConflict] = useState(false);
  const dirty = draft !== baseline;
  useEffect(() => {
    const t = window.setTimeout(() => onDirty(dirty), 0);
    return () => window.clearTimeout(t);
  }, [dirty, onDirty]);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const changes = await patch(enquiry.id, {
        action: "draft",
        draft,
        expectedDraft: baseline,
      });
      setBaseline(changes.draft);
      setDraft(changes.draft);
      setConflict(false);
      onDirty(false);
      onSaved(changes);
      setMessage("Draft saved.");
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      setConflict(status === 409);
      setMessage(
        status === 409
          ? "This enquiry changed elsewhere. Reload the saved version before replacing your edits."
          : error instanceof Error
            ? error.message
            : "The save could not be completed.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <section className="ei-editor" aria-label="Draft reply">
      <h3>Draft reply</h3>
      <p>Unsent draft.</p>
      <textarea
        aria-label="Draft reply"
        maxLength={6000}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onDirty(event.target.value !== baseline);
        }}
        disabled={busy}
      />
      <div className="ei-editor-actions">
        <button
          className="ei-control"
          type="button"
          onClick={() => {
            setDraft(baseline);
            onDirty(false);
            setMessage("");
          }}
          disabled={busy || !dirty}
        >
          Reset
        </button>
        <button
          className="ei-control"
          type="button"
          onClick={() => void save()}
          disabled={busy || !dirty}
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {conflict && (
        <button
          type="button"
          className="ei-control"
          disabled={busy}
          onClick={async () => {
            if (
              lock.current ||
              !window.confirm(
                "Discard your unsaved draft and load the saved version?",
              )
            )
              return;
            lock.current = true;
            setBusy(true);
            onBusy(true);
            try {
              const saved = await patch(enquiry.id);
              setBaseline(saved.draft);
              setDraft(saved.draft);
              onSaved(saved);
              onDirty(false);
              setConflict(false);
              setMessage("Saved draft loaded.");
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to reload. Your draft remains here.",
              );
            } finally {
              lock.current = false;
              setBusy(false);
              onBusy(false);
            }
          }}
        >
          Reload saved draft
        </button>
      )}
    </section>
  );
}
