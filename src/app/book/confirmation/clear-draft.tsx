"use client";
import { useEffect } from "react";
export default function ClearDraft({ id }: { id: string }) {
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("aavana-booking-draft") ?? "null",
      );
      if (saved?.confirmationId === id)
        sessionStorage.removeItem("aavana-booking-draft");
    } catch {
      /* A persisted confirmation remains readable without browser storage. */
    }
  }, [id]);
  return null;
}
