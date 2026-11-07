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
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  return (
    <div className="guest-stay-grid">
      {rooms.map((room) => {
        const details = accommodationDetails[room.id];
        const amenities = details?.amenities ?? [];
        return (
          <article className="guest-stay-card" key={room.id} id={room.id}>
            <CatalogueGallery room={room} />
            <div className="guest-room-copy av-room">
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
              <details className="room-description av-details av-details-inline">
                <summary>Stay details</summary>
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
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M4 12h16m-6-6 6 6-6 6" />
                  </svg>
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

function CatalogueGallery({ room }: { room: CatalogueRoom }) {
  const gallery = accommodationPhotos[room.id] ?? [];
  const photos = gallery.length
    ? gallery
    : [
        {
          src: room.image,
          alt: `Illustrative ${room.name.toLowerCase()} interior`,
        },
      ];
  const [state, setState] = useState({
    requested: 0,
    displayed: 0,
    loaded: [] as number[],
    failed: false,
  });

  return (
    <div className="guest-gallery">
      <div
        className="guest-gallery-main"
        aria-busy={state.requested !== state.displayed}
      >
        {photos.map((photo, index) =>
          index === 0 ||
          index === state.requested ||
          state.loaded.includes(index) ? (
            <Image
              key={photo.src}
              className="guest-gallery-image"
              data-active={index === state.displayed}
              aria-hidden={index !== state.displayed}
              src={photo.src}
              alt={
                index === state.displayed
                  ? `${photo.alt}, not a photograph of the fictional estate`
                  : ""
              }
              fill
              sizes="(max-width: 760px) 100vw, 58vw"
              onLoad={() =>
                setState((current) => ({
                  ...current,
                  loaded: current.loaded.includes(index)
                    ? current.loaded
                    : [...current.loaded, index],
                  displayed:
                    current.requested === index ? index : current.displayed,
                }))
              }
              onError={() =>
                setState((current) =>
                  current.requested === index
                    ? {
                        ...current,
                        requested: current.displayed,
                        failed: true,
                      }
                    : current,
                )
              }
            />
          ) : null,
        )}
      </div>
      <div
        className="guest-gallery-thumbs"
        aria-label={`${room.name} illustrative images`}
      >
        {gallery.map((photo, index) => (
          <button
            className="guest-gallery-button"
            type="button"
            key={photo.src}
            aria-label={`View ${room.name} image ${index + 1}`}
            aria-pressed={state.displayed === index}
            onClick={() =>
              setState((current) => ({
                ...current,
                requested: index,
                displayed: current.loaded.includes(index)
                  ? index
                  : current.displayed,
                failed: false,
              }))
            }
          >
            <Image src={photo.src} alt="" width={120} height={80} />
          </button>
        ))}
      </div>
      {state.failed && (
        <p className="guest-gallery-error" role="status">
          This photo couldn’t load. Please choose another image.
        </p>
      )}
    </div>
  );
}
