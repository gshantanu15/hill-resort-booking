import Image from "next/image";
import Link from "next/link";
import { listRooms } from "@/db/rooms";
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
            <p className="location">Chikkamagaluru, Karnataka</p>
            <h1>
              Leave the hurry
              <br />
              downhill.
            </h1>
            <p>
              Coffee-country mornings. Room to breathe. A quiet place to come
              back to.
            </p>
            <a className="button" href="#stays">
              Explore rooms & villas
            </a>
            <p className="caption">
              A fictional estate. A working demo in the making.
            </p>
          </div>
          <div className="hero-photo">
            <Image
              src="https://images.unsplash.com/photo-1448375240586-882707db888b"
              alt="Illustrative forest with sunlight falling through tall trees"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 55vw"
            />
          </div>
        </section>
        <section id="stays" className="stays">
          <div className="section-heading">
            <div>
              <p>A place of your own</p>
              <h2>Stay a little longer.</h2>
            </div>
            <p>
              Rooms for two. Space for family.
              <br />A villa to make your own.
            </p>
          </div>
          <p className="notice">
            {source === "database"
              ? "Room catalogue connected to PostgreSQL."
              : "Preview catalogue: sample data. Database connection pending."}{" "}
            Availability and checkout arrive in the next increments.
          </p>
          <div className="room-grid">
            {rooms.map((room) => (
              <article key={room.id}>
                <div className="room-photo">
                  <Image
                    src={room.image}
                    alt={room.imageAlt}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                  />
                </div>
                <div className="room-title">
                  <h3>{room.name}</h3>
                  <span>Up to {room.capacity} guests</span>
                </div>
                <p>{room.description}</p>
                <p className="price">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(room.baseRatePaise / 100)}{" "}
                  <span>/ night, before taxes</span>
                </p>
              </article>
            ))}
          </div>
          {rooms.length === 0 && (
            <p>
              No room types are configured yet. Run the documented seed command.
            </p>
          )}
        </section>
        <section id="about" className="estate">
          <p>Make room for quiet.</p>
          <h2>
            Less on the agenda.
            <br />
            More in the moment.
          </h2>
          <p>
            A fictional coffee-estate retreat in the hills of Chikkamagaluru.
            All rooms, rates and photographs are illustrative demo content.
          </p>
        </section>
      </main>
      <footer>
        <Link className="wordmark" href="/">
          Aavana Estate
        </Link>
        <p>Booking demo in development. No real reservations or payments.</p>
        <a href="https://github.com/gshantanu15/hill-resort-booking">
          Project source
        </a>
      </footer>
    </>
  );
}
