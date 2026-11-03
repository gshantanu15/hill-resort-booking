"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "@/lib/demo-staff";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          callbackURL: "/staff",
        }),
      });
      if (!response.ok)
        throw new Error("Sign-in failed. Check your email and password.");
      router.push("/staff");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to sign in.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="staff-form staff-login-form"
      onSubmit={submit}
      aria-busy={busy}
    >
      <label htmlFor="staff-email">Email</label>
      <input
        id="staff-email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />
      <label htmlFor="staff-password">Password</label>
      <input
        id="staff-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error && (
        <p className="staff-error" role="alert">
          {error}
        </p>
      )}
      <button className="staff-button" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="staff-notice">
        Shared synthetic demo account: {DEMO_STAFF_EMAIL} /{" "}
        {DEMO_STAFF_PASSWORD}
      </p>
    </form>
  );
}
