/**
 * The Papyra agent mark: a "P" glyph rendered in the current text colour so it inherits the
 * assistant pill's theme accent. Mirrors the app's "P" brand identity.
 */
export function PapyraLogoOutline({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="currentColor"
      aria-hidden="true"
    >
      <text
        x="96"
        y="138"
        textAnchor="middle"
        fontFamily="Outfit, Segoe UI, Arial, sans-serif"
        fontWeight={700}
        fontSize={150}
      >
        P
      </text>
    </svg>
  );
}
