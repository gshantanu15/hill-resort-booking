"use client";

import { useEffect, useRef, useState } from "react";
import { contactSchema } from "@/lib/booking-contact";
import { enquiryInputSchema } from "@/lib/enquiry-validation";

type Contact = { name: string; email: string; phone?: string };
type Payload = { submissionId: string; contact: Contact; message: string };
const pendingKey = "aavana.pending-enquiry.v1";
const referenceKey = "aavana.saved-enquiry-reference.v1";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Please try again shortly.";
}

export default function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [pending, setPending] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedReference, setSavedReference] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(pendingKey);
        if (saved) {
          const original = JSON.parse(saved) as Payload;
          const parsed = enquiryInputSchema.safeParse(original);
          if (parsed.success) {
            const restored = original;
            setPending(restored);
            setForm({
              ...restored.contact,
              phone: restored.contact.phone ?? "",
              message: restored.message,
            });
          } else sessionStorage.removeItem(pendingKey);
        }
        const reference = sessionStorage.getItem(referenceKey);
        if (reference) setSavedReference(reference);
      } catch {
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {
          /* storage may be blocked */
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setError("");
  };

  const createPayload = (): Payload => ({
    submissionId: crypto.randomUUID(),
    contact: {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
    },
    message: form.message,
  });

  const submit = async (payload: Payload) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(payload));
    } catch {
      setError(
        "Your browser is blocking temporary storage. Enable site storage, then try again.",
      );
      setBusy(false);
      submitting.current = false;
      return;
    }
    setPending(payload);
    try {
      let response: Response;
      try {
        response = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });
      } catch {
        throw new Error(
          "We couldn’t confirm receipt. Please try again; your enquiry details are kept here.",
        );
      }
      const result = (await response.json().catch(() => null)) as {
        reference?: string;
        error?: string;
        code?: string;
      } | null;
      if (!response.ok) {
        if (
          response.status === 429 ||
          (response.status >= 400 && response.status < 500)
        ) {
          setPending(null);
          setForm({
            name: payload.contact.name,
            email: payload.contact.email,
            phone: payload.contact.phone ?? "",
            message: payload.message,
          });
          try {
            sessionStorage.removeItem(pendingKey);
          } catch {
            /* storage may be blocked */
          }
          throw new Error(
            result?.error || "Please check the form and try again.",
          );
        }
        throw new Error(
          result?.error ||
            "We couldn’t confirm receipt. Please try again; your enquiry details are kept here.",
        );
      }
      if (!result?.reference)
        throw new Error(
          "We couldn’t confirm receipt. Please try again; your enquiry details are kept here.",
        );
      setSavedReference(result.reference);
      try {
        sessionStorage.setItem(referenceKey, result.reference);
        sessionStorage.removeItem(pendingKey);
      } catch {
        /* success is already confirmed; storage cleanup is best effort */
      }
      setPending(null);
      setForm({ name: "", email: "", phone: "", message: "" });
      setNotice(
        `Thank you. Your enquiry has reached our team. Your reference is ${result.reference}.`,
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const parsed = contactSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        nextErrors[String(issue.path[0])] =
          issue.path[0] === "name" ? "Please enter your name." : issue.message;
    }
    if (form.message.trim().length < 1)
      nextErrors.message = "Tell us how we can help.";
    if (form.message.length > 4000)
      nextErrors.message = "Keep the enquiry under 4,000 characters.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    void submit(createPayload());
  };

  const retry = () => pending && void submit(pending);
  const locked = Boolean(pending);
  return (
    <form
      className="enquiry-form"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
    >
      {!pending && (notice || savedReference) && (
        <p className="enquiry-success" role="status">
          {notice ||
            `We’ve received your enquiry. Your reference is ${savedReference}.`}
        </p>
      )}
      {pending && (
        <div className="enquiry-pending" role="alert">
          <strong>Your enquiry details are safe.</strong>
          <span>
            {busy
              ? "Sending your enquiry…"
              : "We couldn’t confirm receipt yet. Try again to send the same enquiry without creating a duplicate."}
          </span>
          <button
            type="button"
            className="button"
            onClick={retry}
            disabled={busy}
          >
            {busy ? "Trying again…" : "Try again"}
          </button>
        </div>
      )}
      {error && (
        <p className="enquiry-error" role="alert">
          {error}
        </p>
      )}
      <div className="enquiry-field">
        <label htmlFor="enquiry-name">Full name</label>
        <input
          id="enquiry-name"
          name="name"
          required
          maxLength={120}
          value={locked ? pending?.contact.name : form.name}
          readOnly={locked}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          autoComplete="name"
        />
        {fieldErrors.name && (
          <span id="name-error" className="field-error">
            {fieldErrors.name}
          </span>
        )}
      </div>
      <div className="enquiry-field">
        <label htmlFor="enquiry-email">Email</label>
        <input
          id="enquiry-email"
          name="email"
          type="email"
          required
          maxLength={254}
          value={locked ? pending?.contact.email : form.email}
          readOnly={locked}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          autoComplete="email"
        />
        {fieldErrors.email && (
          <span id="email-error" className="field-error">
            {fieldErrors.email}
          </span>
        )}
      </div>
      <div className="enquiry-field">
        <label htmlFor="enquiry-phone">
          Phone <span className="optional">optional</span>
        </label>
        <input
          id="enquiry-phone"
          name="phone"
          type="tel"
          maxLength={32}
          value={locked ? (pending?.contact.phone ?? "") : form.phone}
          readOnly={locked}
          onChange={(event) => update("phone", event.target.value)}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={`phone-help${fieldErrors.phone ? " phone-error" : ""}`}
          autoComplete="tel"
        />
        <span id="phone-help" className="field-help">
          Use a country code, for example +91 98765 43210.
        </span>
        {fieldErrors.phone && (
          <span id="phone-error" className="field-error">
            {fieldErrors.phone}
          </span>
        )}
      </div>
      <div className="enquiry-field">
        <label htmlFor="enquiry-message">What can we help with?</label>
        <textarea
          id="enquiry-message"
          name="message"
          required
          rows={7}
          value={locked ? pending?.message : form.message}
          readOnly={locked}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          maxLength={4000}
        />
        {fieldErrors.message && (
          <span id="message-error" className="field-error">
            {fieldErrors.message}
          </span>
        )}
      </div>
      <button className="button" type="submit" disabled={busy || locked}>
        {busy ? "Sending enquiry…" : "Send enquiry"}
      </button>
      <p className="enquiry-form-note">
        Your enquiry goes directly to our team. We’ll use the details above to
        help with your plans.
      </p>
    </form>
  );
}
