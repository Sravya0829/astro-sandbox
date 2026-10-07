export default function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="12" cy="12" rx="10.5" ry="4" stroke="currentColor" strokeWidth="1" transform="rotate(-24 12 12)" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}
