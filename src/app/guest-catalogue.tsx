"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { accommodationDetails, accommodationPhotos } from "@/lib/accommodation";
import { GuestIcon } from "./guest-icon";

function amenityIcon(amenity: string) {
  if (amenity === "En-suite bathroom") return "bath" as const;
  if (amenity === "Wi-Fi") return "wifi" as const;
  if (amenity === "Tea and coffee station") return "cup" as const;
  if (amenity.includes("reading") || amenity.includes("sit-out"))
    return "leaf" as const;
  if (amenity.includes("seating") || amenity.includes("living"))
    return "chair" as const;
  return "home" as const;
}
type CatalogueRoom = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  baseRatePaise: number;
  image: string;
};

export function GuestCatalogue({ rooms }: { rooms: CatalogueRoom[] }) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  return (
    <div className="guest-stay-grid">
      {rooms.map((room) => {
        const details = accommodationDetails[room.id];
        const gallery = accommodationPhotos[room.id] ?? [];
        const index = selected[room.id] ?? 0;
        const amenities = details?.amenities ?? [];
        return (
          <article className="guest-stay-card" key={room.id} id={room.id}>
            <div className="guest-gallery">
              <div className="guest-gallery-main">
                <Image
                  src={gallery[index]?.src ?? room.image}
                  alt={`${gallery[index]?.alt ?? `Illustrative ${room.name.toLowerCase()} interior`}, not a photograph of the fictional estate`}
                  fill
                  sizes="(max-width: 760px) 100vw, 58vw"
                />
              </div>
              <div
                className="guest-gallery-thumbs"
                aria-label={`${room.name} illustrative images`}
              >
                {gallery.map((photo, photoIndex) => (
                  <button
                    className="guest-gallery-button"
                    type="button"
                    key={photo.src}
                    aria-label={`View ${room.name} image ${photoIndex + 1}`}
                    aria-pressed={index === photoIndex}
                    onClick={() =>
                      setSelected((current) => ({
                        ...current,
                        [room.id]: photoIndex,
                      }))
                    }
                  >
                    <Image src={photo.src} alt="" width={120} height={80} />
                  </button>
                ))}
              </div>
            </div>
            <div className="guest-room-copy">
              <div className="guest-room-heading">
                <div>
                  <h3>{room.name}</h3>
                </div>
                <span>Up to {room.capacity} guests</span>
              </div>
              <p className="guest-room-summary">
                {details?.summary ?? room.description}
              </p>
              <ul
                className="guest-amenities"
                aria-label={`${room.name} highlights`}
              >
                {amenities
                  .filter((amenity) =>
                    [
                      "En-suite bathroom",
                      "Wi-Fi",
                      "Tea and coffee station",
                      "Reading corner",
                      "Private sit-out",
                      "Additional seating",
                      "Separate living space",
                    ].includes(amenity),
                  )
                  .slice(-4)
                  .map((amenity) => (
                    <li key={amenity}>
                      <GuestIcon name={amenityIcon(amenity)} />
                      {amenity}
                    </li>
                  ))}
              </ul>
              <details className="room-description">
                <summary>See all stay details</summary>
                <p>{room.description}</p>
                <ul className="amenities" aria-label={`${room.name} amenities`}>
                  {amenities.map((amenity) => (
                    <li key={amenity}>{amenity}</li>
                  ))}
                </ul>
              </details>
              <div className="guest-room-footer">
                <p className="price">
                  {money.format(room.baseRatePaise / 100)}{" "}
                  <span>indicative / night · exact price depends on dates</span>
                </p>
                <Link
                  className="button room-book"
                  href={`/book?room=${encodeURIComponent(room.id)}`}
                >
                  Choose this stay
                </Link>
              </div>
            </div>
          </article>
        );
      })}
      {rooms.length === 0 && (
        <p>
          Our stays aren’t available to browse right now. Please try again
          later.
        </p>
      )}
    </div>
  );
}
