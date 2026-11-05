"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import type { EnquiryAIOutput } from "@/lib/enquiry-ai-output";

export type AssistantEnquiry = {
  id: string;
  processingState: string;
  extracted: EnquiryAIOutput | null;
  analysisModel: string | null;
  analysisProvider: string | null;
  analysisFailure: string | null;
  analysedAt: string | null;
  routeEdited: boolean;
  draftEdited: boolean;
  draft: string | null;
};
type FullDetail = AssistantEnquiry & Record<string, unknown>;
type Props = {
  enquiry: AssistantEnquiry;
  canAnalyse: () => boolean;
  onUpdated: (enquiry: FullDetail) => void;
  onBusy: (busy: boolean) => void;
};
type AiStatus = {
  enabled: boolean;
  reason: string | null;
  requestsUsed: number;
  dailyRequestLimit: number;
  dailyReservedUsd: number;
  dailyBudgetUsd: number;
};

async function readJson(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(body?.error || "The analysis could not be completed.");
    return body;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message !== "The analysis could not be completed."
    )
      throw new Error(
        "The analysis could not be confirmed. The enquiry remains available for manual review.",
      );
    throw error;
  }
}

function text(valueToShow: unknown) {
  return typeof valueToShow === "string" || typeof valueToShow === "number"
    ? String(valueToShow)
    : "Not provided";
}

export default function EnquiryAssistant({
  enquiry,
  canAnalyse,
  onUpdated,
  onBusy,
}: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [replaceRouting, setReplaceRouting] = useState(false);
  const [replaceDraft, setReplaceDraft] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    readJson("/api/staff/ai")
      .then((value) => {
        if (active) setStatus(value as AiStatus);
      })
      .catch(() => {
        if (active)
          setStatus({
            enabled: false,
            reason:
              "AI status is unavailable. Manual handling remains available.",
            requestsUsed: 0,
            dailyRequestLimit: 100,
            dailyReservedUsd: 0,
            dailyBudgetUsd: 1,
          });
      });
    return () => {
      active = false;
    };
  }, []);
  const analyse = async () => {
    if (lock.current || !canAnalyse()) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setMessage("");
    try {
      const current = (await readJson("/api/staff/ai")) as AiStatus;
      setStatus(current);
      if (!current.enabled) {
        setMessage(current.reason || "AI analysis is currently unavailable.");
        return;
      }
      const result = await readJson(
        `/api/staff/enquiries/${enquiry.id}/analyse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replaceRouting, replaceDraft }),
        },
      );
      if (!result?.enquiry)
        throw new Error(
          "The analysis response was incomplete. The enquiry remains available for manual review.",
        );
      onUpdated(result.enquiry as FullDetail);
      setMessage("Analysis saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The analysis could not be completed. The enquiry remains available for manual review.",
      );
      try {
        const refreshed = await readJson(`/api/staff/enquiries/${enquiry.id}`);
        if (refreshed?.enquiry) onUpdated(refreshed.enquiry as FullDetail);
      } catch {
        /* preserve local reader state */
      }
    } finally {
      setReplaceRouting(false);
      setReplaceDraft(false);
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  const extracted = enquiry.extracted;
  const uncertainties = extracted?.uncertainties;
  return (
    <section className="ei-assistant" aria-label="AI assistance">
      <div className="ei-assistant-heading">
        <div>
          <h3>Assistant</h3>
          <p>Extract details and prepare a reply.</p>
        </div>
        <Button
          className="ei-control"
          onPress={() => void analyse()}
          isDisabled={busy || status?.enabled === false}
        >
          {busy ? "Analysing…" : "Analyse enquiry"}
        </Button>
      </div>
      {enquiry.processingState === "processing" && !busy && (
        <p role="status">
          Analysis is in progress. Refresh shortly; interrupted requests can be
          retried after two minutes.
        </p>
      )}
      {status && !status.enabled && (
        <p className="ei-assistant-message">
          {status.reason || "AI analysis is currently unavailable."}
        </p>
      )}
      {(enquiry.routeEdited || enquiry.draftEdited) && (
        <fieldset className="ei-assistant-replace" disabled={busy}>
          <legend>Replace saved staff work</legend>
          {enquiry.routeEdited && (
            <label>
              <input
                type="checkbox"
                checked={replaceRouting}
                onChange={(event) => setReplaceRouting(event.target.checked)}
              />{" "}
              Replace saved routing
            </label>
          )}
          {enquiry.draftEdited && (
            <label>
              <input
                type="checkbox"
                checked={replaceDraft}
                onChange={(event) => setReplaceDraft(event.target.checked)}
              />{" "}
              Replace saved draft
            </label>
          )}
        </fieldset>
      )}
      <dl className="ei-extraction">
        <div>
          <dt>Dates</dt>
          <dd>
            {extracted?.dates.checkIn && extracted.dates.checkOut
              ? `${extracted.dates.checkIn} to ${extracted.dates.checkOut}`
              : extracted?.dates.raw || "Not provided"}
            {extracted?.dates.yearMissing && " (year omitted by guest)"}
          </dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>
            {extracted?.guests.adults != null ||
            extracted?.guests.children != null
              ? `${text(extracted?.guests.adults)} adults; ${text(extracted?.guests.children)} children`
              : extracted?.guests.min != null
                ? `${extracted.guests.min}${extracted.guests.max !== extracted.guests.min && extracted.guests.max != null ? `–${extracted.guests.max}` : ""} guests; adult/child split unknown`
                : "Not provided"}
          </dd>
        </div>
        <div>
          <dt>Budget preference</dt>
          <dd>
            {extracted?.budget.raw ||
              (extracted?.budget.min != null
                ? `${extracted.budget.currency ?? ""} ${extracted.budget.min}–${extracted.budget.max ?? extracted.budget.min}`
                : "Not provided")}
          </dd>
        </div>
      </dl>
      {Array.isArray(uncertainties) && uncertainties.length > 0 && (
        <div className="ei-uncertainties">
          <strong>Staff notes</strong>
          <ul>
            {uncertainties.map((item, index) => (
              <li key={index}>{text(item)}</li>
            ))}
          </ul>
        </div>
      )}
      {enquiry.analysisModel && (
        <p className="ei-analysis-meta">
          Model: {enquiry.analysisModel}
          {enquiry.analysisProvider &&
            `; provider: ${enquiry.analysisProvider}`}
          {enquiry.analysedAt &&
            `; analysed: ${new Date(enquiry.analysedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`}
        </p>
      )}
      {enquiry.analysisFailure && !message && (
        <p className="ei-assistant-message" role="alert">
          {enquiry.analysisFailure === "disabled"
            ? "AI is paused."
            : "The last analysis needs manual review. Saved staff work is preserved."}
        </p>
      )}
      {message && (
        <p className="ei-assistant-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
