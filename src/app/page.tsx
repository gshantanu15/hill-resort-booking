import Image from "next/image";
import { GuestFooter } from "./guest-footer";
import { GuestHeader } from "./guest-header";
import { listRooms } from "@/db/rooms";
import { GuestCatalogue } from "./guest-catalogue";
import "./catalogue.css";
export const dynamic = "force-dynamic";
export default async function Home() {
  const { rooms, source } = await listRooms();
  return (
    <>
      <GuestHeader />

      <main id="main" className="av-main-motion">
        <section className="av-hero">
          <div className="av-landscape">
            <Image
              src="/images/design/blassenstein-erlauftal-mit-nebel-02-panorama-1920.jpg"
              alt="Illustrative morning mist flowing between wooded hills"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1440px"
            />
          </div>
          <div className="av-copy">
            <h1>
              Leave the hurry
              <br />
              downhill.
            </h1>
            <div className="av-invitation">
              <p>
                Coffee-country mornings. Room to breathe. A quiet place to
                return.
              </p>
              <a className="button" href="#stays">
                Explore rooms &amp; villas
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 4v16m-6-6 6 6 6-6" />
                </svg>
              </a>
            </div>
          </div>
          <span className="av-location">Chikkamagaluru, Karnataka</span>
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
            </div>
            <p>
              Rooms for two. Space for family.
              <br />A villa to make your own.
            </p>
          </div>
          <GuestCatalogue rooms={rooms} />
        </section>
        <section id="about" className="estate av-estate">
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
      <GuestFooter source={source} />
    </>
  );
}
