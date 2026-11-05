"use client";

import Link from "next/link";
import StaffIcon from "./staff-icon";
import "./staff-navigation.css";

export default function StaffNavigation({
  current,
  beforeNavigate,
  onSignOut,
  busy = false,
}: {
  current: "calendar" | "enquiries";
  beforeNavigate: () => boolean;
  onSignOut: () => void;
  busy?: boolean;
}) {
  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!beforeNavigate()) event.preventDefault();
  };
  return (
    <header className="staff-navigation">
      <div className="staff-navigation-inner">
        <Link href="/" className="staff-navigation-brand" onClick={leave}>
          Aavana <span>Estate</span>
        </Link>
        <span className="staff-navigation-label">Staff workspace</span>
        <nav aria-label="Staff navigation">
          <Link href="/" onClick={leave}>
            Guest site
          </Link>
          <Link
            href="/staff/enquiries"
            aria-current={current === "enquiries" ? "page" : undefined}
            onClick={leave}
          >
            Enquiries
          </Link>
          <Link
            href="/staff"
            aria-current={current === "calendar" ? "page" : undefined}
            onClick={leave}
          >
            Calendar
          </Link>
          <button type="button" onClick={onSignOut} disabled={busy}>
            <StaffIcon name="logout" />
            <span>Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
