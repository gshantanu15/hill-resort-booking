import { LoginForm } from "./login-form";

export default function StaffLoginPage() {
  return (
    <main className="staff-page">
      <section className="staff-panel" aria-labelledby="staff-login-title">
        <h1 id="staff-login-title">Staff sign in</h1>
        <p className="staff-notice">
          Use your authorized resort staff account.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
