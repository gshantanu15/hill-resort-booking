import Image from "next/image";
import localFont from "next/font/local";
import { GuestFooter } from "../guest-footer";
import { GuestHeader } from "../guest-header";
import EnquiryForm from "./enquiry-form";
import "./enquiry.css";

const enquiryFont = localFont({
  src: "../../../public/fonts/rethink-sans-400-500.ttf",
  variable: "--font-enquiry",
  weight: "400 500",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function EnquirePage() {
  return (
    <>
      <GuestHeader enquiry />
      <main className={`enquiry-page ${enquiryFont.variable}`} id="main">
        <div className="enquiry-layout">
          <section className="enquiry-intro" aria-labelledby="enquiry-heading">
            <p className="enquiry-eyebrow">Talk to the estate</p>
            <h1 id="enquiry-heading">Tell us what you’re planning.</h1>
            <p className="enquiry-lead">
              Whether you’re planning a quiet stay or bringing people together,
              tell us what you have in mind. Our team is here to help.
            </p>
            <p className="enquiry-context">
              For a room, villa, or team stay, include your dates and group size
              in the message. Share these details so the team can help with your
              plans.
            </p>
            <figure className="enquiry-photo">
              <Image
                src="/images/estate/shade-coffee.webp"
                alt="Coffee plants growing beneath shade trees in Chikkamagaluru"
                width={900}
                height={673}
                loading="eager"
                sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1023px) 42vw, 514px"
              />
              <figcaption>
                Photograph by{" "}
                <a href="https://commons.wikimedia.org/wiki/File:Traditional_shade_coffee_plantation_Chikmagalur_1.jpg">
                  Anand Osuri
                </a>
                {" · "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/">
                  CC BY-SA 4.0
                </a>
                {" · Cropped"}
              </figcaption>
            </figure>
          </section>
          <div className="enquiry-form-shell">
            <EnquiryForm />
          </div>
        </div>
      </main>
      <GuestFooter />
    </>
  );
}
