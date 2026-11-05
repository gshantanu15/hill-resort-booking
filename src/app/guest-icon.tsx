type IconName = "bath" | "leaf" | "wifi" | "cup" | "chair" | "home";

export function GuestIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    bath: "M4 12h16M6 12V7a2 2 0 0 1 4 0v1h8a2 2 0 0 1 2 2v2M6 16v2M18 16v2",
    leaf: "M19 4C10 4 5 8 5 15c0 2 1 4 3 5 0-6 4-10 11-12-4 3-7 6-8 11",
    wifi: "M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 15a5 5 0 0 1 6 0M12 19h.01",
    cup: "M5 5h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V5ZM17 8h2a2 2 0 0 1 0 4h-2M8 21h8",
    chair: "M7 5h8a2 2 0 0 1 2 2v6H7V5ZM5 13h14M7 13v6M17 13v6M4 19h16",
    home: "M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}
