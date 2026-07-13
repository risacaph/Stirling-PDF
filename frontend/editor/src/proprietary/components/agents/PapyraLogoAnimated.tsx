import "@app/components/chat/ChatPanel.css";

/**
 * Animated variant of the Papyra agent mark, shown while the assistant is thinking — the "P" gently
 * pulses. Falls back to a static mark when the user prefers reduced motion (handled in CSS).
 */
export function PapyraLogoAnimated({ size = 20 }: { size?: number }) {
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
        className="papyra-thinking__mark"
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
