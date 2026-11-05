export type AccommodationDetails = {
  summary: string;
  amenities: string[];
};

const shared = [
  "En-suite bathroom",
  "Hot water",
  "Wi-Fi",
  "Ceiling fan",
  "Tea and coffee station",
  "Linen and towels",
];

export const accommodationDetails: Record<string, AccommodationDetails> = {
  "estate-room": {
    summary: "A reading corner for slow mornings",
    amenities: [...shared, "Reading corner", "Writing desk"],
  },
  "garden-room": {
    summary: "A private sit-out for the family",
    amenities: [
      ...shared,
      "Private sit-out",
      "Additional seating",
      "Family storage",
    ],
  },
  "estate-villa": {
    summary: "A living space and sheltered terrace",
    amenities: [
      ...shared,
      "Separate living space",
      "Sheltered terrace",
      "Dining nook",
    ],
  },
};

export const accommodationPhotos: Record<
  string,
  { src: string; alt: string }[]
> = {
  "estate-room": [
    {
      src: "/images/design/canopy-bed-of-khan-pool-suite-in-amantaka-luxury-resort-hote-1920.jpg",
      alt: "Illustrative estate room interior",
    },
    {
      src: "/images/design/aavana/estate-room-reading-corner.jpg",
      alt: "Illustrative reading corner",
    },
    {
      src: "/images/design/aavana/estate-room-bathroom.jpg",
      alt: "Illustrative en-suite bathroom",
    },
  ],
  "garden-room": [
    {
      src: "/images/design/canopy-bed-and-wardrobes-in-khan-pool-suite-at-amantaka-luxu-1920.jpg",
      alt: "Illustrative garden room interior",
    },
    {
      src: "/images/design/aavana/garden-room-sit-out.jpg",
      alt: "Illustrative private sit-out",
    },
  ],
  "estate-villa": [
    {
      src: "/images/design/lobby-lounge-of-amantaka-suite-amantaka-luxury-resort-hotel--1920.jpg",
      alt: "Illustrative estate villa interior",
    },
    {
      src: "/images/design/aavana/estate-villa-kitchen.jpg",
      alt: "Illustrative kitchen concept",
    },
  ],
};
