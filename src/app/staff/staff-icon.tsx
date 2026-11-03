const paths = {
  previous: <path d="m14 6-6 6 6 6" />,
  next: <path d="m10 6 6 6-6 6" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  refresh: (
    <path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
  ),
  logout: <path d="M9 4H4v16h5M14 8l4 4-4 4M8 12h10" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
};

export default function StaffIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="staff-icon" aria-hidden="true" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}
