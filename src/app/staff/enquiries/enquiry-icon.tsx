import type { ReactNode } from "react";
type IconName =
  | "inbox"
  | "website"
  | "email"
  | "whatsapp"
  | "chevron"
  | "arrow"
  | "close"
  | "filter"
  | "refresh"
  | "plus"
  | "clock"
  | "person"
  | "alert"
  | "sparkle"
  | "copy"
  | "message"
  | "logout";
const paths: Record<IconName, ReactNode> = {
  ...{
    inbox: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </>
    ),
    website: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    email: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M4 20l1-5a9 9 0 1 1 4 5z" />
        <path d="M9 7c-2 1 0 7 4 9 2 1 4 0 3-2l-2-1-1 1c-2-1-3-2-3-4l1-1z" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    arrow: <path d="m14 6-6 6 6 6M8 12h13" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    filter: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="2" />
        <circle cx="15" cy="17" r="2" />
      </>
    ),
    refresh: <path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2zM12 9v5M12 17h.01" />
      </>
    ),
    sparkle: (
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    message: (
      <>
        <path d="M21 16a2 2 0 0 1-2 2H8l-5 4V4h18z" />
        <path d="M7 8h10M7 12h7" />
      </>
    ),
  },
  logout: <path d="M10 5H5v14h5m0-7h9m0 0-4-4m4 4-4 4" />,
};
export default function EnquiryIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
export type { IconName };
