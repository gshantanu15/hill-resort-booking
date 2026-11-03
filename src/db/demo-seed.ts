import { sampleRooms } from "./sample-rooms";

export const SEED_START_DATE = "2026-11-03";
export const SEED_NIGHTS = 180;

// Owner-approved fictional demo configuration, not live channel availability.
const stock = {
  "estate-room": {
    physicalUnits: 48,
    websiteLimit: 12,
    weekdayPricePaise: 900000,
  },
  "garden-room": {
    physicalUnits: 16,
    websiteLimit: 4,
    weekdayPricePaise: 1050000,
  },
  "estate-villa": {
    physicalUnits: 12,
    websiteLimit: 3,
    weekdayPricePaise: 1850000,
  },
} as const;

export function createDemoSeed() {
  const plan = { id: "standard-stay", name: "Standard stay" };
  const rooms = sampleRooms.map((room) => {
    const { physicalUnits, websiteLimit } =
      stock[room.id as keyof typeof stock];
    return { ...room, physicalUnits, websiteLimit };
  });
  const inventory = [];
  const rates = [];
  const start = Date.parse(`${SEED_START_DATE}T00:00:00Z`);
  for (const room of rooms) {
    for (let night = 0; night < SEED_NIGHTS; night++) {
      // UTC is calendar arithmetic here, not a choice of resort timezone.
      const date = new Date(start + night * 86400000);
      const stayDate = date.toISOString().slice(0, 10);
      const weekend = date.getUTCDay() === 5 || date.getUTCDay() === 6;
      const price = stock[room.id as keyof typeof stock].weekdayPricePaise;
      inventory.push({
        roomTypeId: room.id,
        stayDate,
        websiteLimit: room.websiteLimit,
        allotment: room.websiteLimit,
        booked: 0,
        blackout: false,
      });
      rates.push({
        roomTypeId: room.id,
        ratePlanId: plan.id,
        stayDate,
        pricePaise: weekend ? (price * 110) / 100 : price,
      });
    }
  }
  return { rooms, plan, inventory, rates };
}
