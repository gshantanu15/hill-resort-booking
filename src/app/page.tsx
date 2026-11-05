import Image from "next/image";
import Link from "next/link";
import { listRooms } from "@/db/rooms";
import { GuestCatalogue } from "./guest-catalogue";
import "./catalogue.css";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { rooms, source } = await listRooms();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header>
        <Link className="wordmark" href="/">
          Aavana <span>Estate</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#stays">Our stays</a>
          <a href="#about">The estate</a>
          <a className="button small" href="#stays">
            Find your stay
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <h1>
              Leave the hurry
              <br />
              downhill.
            </h1>
            <p>
              Coffee-country mornings. Room to breathe. A quiet place to return.
            </p>
            <a className="button" href="#stays">
              Explore rooms & villas
            </a>
          </div>
          <div className="hero-photo" data-slot="estate-landscape">
            <Image
              src="/images/design/blassenstein-erlauftal-mit-nebel-02-panorama-1920.jpg"
              alt="Illustrative morning mist flowing between wooded hills"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1440px"
            />
          </div>
          <span className="hero-location">Chikkamagaluru, Karnataka</span>
        </section>
        <section id="stays" className="stays">
          <div className="section-heading">
            <div>
              <h2>Stay a little longer.</h2>
              <p>A place of your own.</p>
              <span className="collection-note">
                Illustrative rooms, amenities and rates · availability checked
                when you choose dates
              </span>
              <span className="collection-note">
                Room images are illustrative; some are AI-generated concept
                images supplied for this preview.
              </span>
            </div>
            <p>
              Rooms for two. Space for family.
              <br />A villa to make your own.
            </p>
          </div>
          <GuestCatalogue rooms={rooms} />
        </section>
        <section id="about" className="estate">
          <div className="estate-heading">
            <h2>
              Less on the agenda.
              <br />
              More in the moment.
            </h2>
          </div>
          <div className="estate-copy">
            <p>Make room for quiet.</p>
            <p>
              A coffee-estate retreat in the hills of Chikkamagaluru. A place to
              slow down, settle in, and stay a little longer.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-footer-main">
          <div className="site-footer-brand">
            <Link className="wordmark" href="/">
              Aavana Estate
            </Link>
            <p>
              Booking demo in development. No real reservations or payments.
            </p>
          </div>
          <nav className="site-footer-links" aria-label="Footer navigation">
            <a href="https://github.com/gshantanu15/hill-resort-booking">
              Project source
            </a>
            <Link className="site-footer-staff-link" href="/staff/login">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
              </svg>
              Staff sign in
            </Link>
          </nav>
        </div>
        <details className="demo-notes">
          <summary>About this demo & photographs</summary>
          <p>
            A fictional estate. A working demo in the making. All rooms, rates
            and photographs are illustrative demo content.
          </p>
          <p>
            {source === "database"
              ? "Room catalogue connected to PostgreSQL."
              : "Preview catalogue: sample data. Database connection pending."}{" "}
            Choose a stay to check dates, see an authoritative total, and
            complete a clearly labelled test booking.
          </p>
          <p data-credits>
            Photographs:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Blassenstein_Erlauftal_mit_Nebel_02_Panorama.JPG">
              Uoaei1, CC BY-SA 3.0
            </a>
            ; room interiors by{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Canopy_bed_of_Khan_Pool_Suite_in_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg">
              Basile Morin
            </a>{" "}
            (
            <a href="https://commons.wikimedia.org/wiki/File:Canopy_bed_and_wardrobes_in_Khan_Pool_Suite_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg">
              bedroom
            </a>
            ,{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Lobby_lounge_of_Amantaka_Suite_Amantaka_luxury_Resort_%26_Hotel_Luang_Prabang_Laos.jpg">
              lounge
            </a>
            ), CC BY-SA 4.0, Wikimedia Commons. Images cropped and colour
            adjusted for this concept. Additional room detail images were
            supplied as AI-generated illustrations for this preview.
          </p>
        </details>
      </footer>
    </>
  );
}
