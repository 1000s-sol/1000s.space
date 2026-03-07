export function ArchivesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      strokeWidth="4.5"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9.16" y="9.16" width="45.69" height="45.69" rx="2.51" />
      <polyline points="9.16 41.95 20.68 32.19 29.71 40.38 43.27 23.51 54.77 40.38" />
      <circle cx="19.76" cy="19.38" r="3.93" />
    </svg>
  );
}
