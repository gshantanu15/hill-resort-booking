import EnquiryForm from "./enquiry-form";
import "./enquiry.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EnquirePage() {
  return (
    <main className="enquiry-page">
      <header className="enquiry-header">
        <Link className="wordmark" href="/">
          Aavana <span>Estate</span>
        </Link>
        <Link href="/">Back to stays</Link>
      </header>
      <section className="enquiry-intro">
        <p className="eyebrow">Talk to the estate</p>
        <h1>Tell us what you’re planning.</h1>
        <p>
          Whether you’re planning a quiet stay or bringing people together, tell
          us what you have in mind. Our team is here to help.
        </p>
      </section>
      <EnquiryForm />
    </main>
  );
}
