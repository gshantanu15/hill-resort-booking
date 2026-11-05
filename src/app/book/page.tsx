import { listRooms } from "@/db/rooms";
import Checkout from "./checkout";
import "./booking.css";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const { rooms } = await listRooms();
  return <Checkout rooms={rooms} />;
}
