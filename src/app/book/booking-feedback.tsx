"use client";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";

export default function BookingFeedback({
  message,
  busy,
}: {
  message: string;
  busy: boolean;
}) {
  useEffect(() => {
    const options = {
      id: "guest-booking",
      toasterId: "guest-booking",
      duration: Infinity,
      className: "booking-alert",
      closeButton: !busy,
    };
    if (message) {
      if (/declined|unavailable|cannot start/i.test(message))
        toast.error(message, options);
      else if (/verify|saved|quote changed|expired/i.test(message))
        toast.info(message, options);
      else toast.warning(message, options);
    } else if (busy)
      toast.loading("Checking your booking…", {
        ...options,
        className: "booking-progress",
      });
    else toast.dismiss("guest-booking");
    return () => {
      toast.dismiss("guest-booking");
    };
  }, [message, busy]);
  return (
    <div className="booking-feedback">
      <Toaster
        id="guest-booking"
        className="booking-toaster"
        position="top-center"
        visibleToasts={1}
        closeButton
        expand
        toastOptions={{ unstyled: true }}
      />
    </div>
  );
}
