import Image from "next/image";
import Link from "next/link";
import { GuestArrow } from "./guest-header";

export function GuestFooter({ source }: { source?: "database" | "sample" }) {
  return (
    <footer className="guest-footer" aria-labelledby="guest-footer-heading">
      <div className="guest-chrome-inner guest-footer-inner">
        <div className="guest-footer-close">
          <div className="guest-footer-invitation">
            <h2 id="guest-footer-heading">Your next stay at Aavana</h2>
            <p>
              Rooms for two. Space for family.
              <br />A villa to make your own.
            </p>
            <Link className="button" href="/#stays" prefetch={false}>
              Book a stay <GuestArrow />
            </Link>
          </div>
          <Image
            className="guest-footer-photo"
            src="/images/estate/green-hills-road.webp"
            alt="Illustrative view of a road winding through the Chikkamagaluru hills"
            width={900}
            height={1200}
            sizes="(max-width: 479px) 31vw, (max-width: 700px) 34vw, 336px"
          />
        </div>
        <Link className="guest-footer-signature" href="/" prefetch={false}>
          Aavana <span>Estate</span>
        </Link>
        <div className="guest-footer-meta">
          <p>Booking demo in development. No real reservations or payments.</p>
          <nav aria-label="Footer navigation">
            <Link href="/enquire" prefetch={false}>
              Make an enquiry
            </Link>
            <Link
              className="guest-footer-staff"
              href="/staff/login"
              prefetch={false}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="guest-arrow"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
              </svg>
              Staff sign in
            </Link>
            <a href="https://github.com/gshantanu15/hill-resort-booking">
              Project source
            </a>
          </nav>
        </div>
        <details className="guest-footer-notes" id="photo-credits">
          <summary>About this demo &amp; photographs</summary>
          <p>
            A fictional estate. All rooms, rates and photographs are
            illustrative demo content.
          </p>
          {source && (
            <p>
              {source === "database"
                ? "Room catalogue connected to PostgreSQL."
                : "Preview catalogue: sample data. Database connection pending."}{" "}
              Choose a stay to check dates, see an authoritative total, and
              complete a clearly labelled test booking.
            </p>
          )}
          <p>
            Regional hill road by{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Green_hills_and_Winding_Road.jpg">
              Deshna Subramanian
            </a>{" "}
            (
            <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>
            ). Mist panorama by{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Blassenstein_Erlauftal_mit_Nebel_02_Panorama.JPG">
              Uoaei1
            </a>{" "}
            (
            <a href="https://creativecommons.org/licenses/by-sa/3.0/">
              CC BY-SA 3.0
            </a>
            ). Room interiors by Basile Morin:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Canopy_bed_of_Khan_Pool_Suite_in_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg">
              Estate room
            </a>
            ,{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Canopy_bed_and_wardrobes_in_Khan_Pool_Suite_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg">
              Garden room
            </a>
            ,{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Lobby_lounge_of_Amantaka_Suite_Amantaka_luxury_Resort_%26_Hotel_Luang_Prabang_Laos.jpg">
              villa
            </a>{" "}
            (
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </a>
            ). Photographs via Wikimedia Commons, cropped and resized; the mist
            panorama and interiors were also colour adjusted. Some room details
            are AI illustrations supplied for the preview.
          </p>
        </details>
        <p className="guest-footer-location">Chikkamagaluru, Karnataka</p>
      </div>
    </footer>
  );
}
