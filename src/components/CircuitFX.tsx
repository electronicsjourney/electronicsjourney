/**
 * CircuitFX — subtle electronics-themed decoration.
 *
 * Renders three fixed, pointer-events-none layers behind app content:
 *  1. Faint PCB grid + dot pattern (via CSS in styles.css body).
 *  2. Animated circuit traces with glowing nodes and a travelling signal pulse.
 *  3. Optional large semi-transparent microchip illustration behind the hero.
 *
 * Everything sits at 5–10% opacity so the page stays clean and readable.
 */
export function CircuitFX() {
  return (
    <>
      {/* Full-viewport animated circuit traces + nodes + signal pulse */}
      <svg
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ej-trace" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#00C2FF" stopOpacity="0.0" />
            <stop offset="0.5" stopColor="#00C2FF" stopOpacity="0.9" />
            <stop offset="1" stopColor="#00C2FF" stopOpacity="0.0" />
          </linearGradient>
          <filter id="ej-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static traces (very faint) */}
        <g stroke="#00C2FF" strokeOpacity="0.09" fill="none" strokeWidth="1">
          <path d="M0 160 L280 160 L320 200 L720 200 L760 160 L1440 160" />
          <path d="M0 460 L200 460 L240 500 L900 500 L940 460 L1440 460" />
          <path d="M0 740 L360 740 L400 700 L1040 700 L1080 740 L1440 740" />
          <path d="M180 0 L180 220 L220 260 L220 600 L180 640 L180 900" />
          <path d="M1260 0 L1260 240 L1220 280 L1220 620 L1260 660 L1260 900" />
        </g>

        {/* Animated travelling signal pulses */}
        <g fill="none" strokeWidth="1.5" filter="url(#ej-glow)">
          <path
            d="M0 160 L280 160 L320 200 L720 200 L760 160 L1440 160"
            stroke="url(#ej-trace)"
            strokeDasharray="140 1600"
            opacity="0.55"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-1740" dur="9s" repeatCount="indefinite" />
          </path>
          <path
            d="M0 460 L200 460 L240 500 L900 500 L940 460 L1440 460"
            stroke="url(#ej-trace)"
            strokeDasharray="120 1800"
            opacity="0.45"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-1920" dur="12s" repeatCount="indefinite" />
          </path>
          <path
            d="M0 740 L360 740 L400 700 L1040 700 L1080 740 L1440 740"
            stroke="url(#ej-trace)"
            strokeDasharray="100 1900"
            opacity="0.4"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-2000" dur="14s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Glowing connection nodes at trace intersections */}
        <g fill="#00C2FF" filter="url(#ej-glow)">
          {[
            [280, 160], [320, 200], [720, 200], [760, 160],
            [200, 460], [240, 500], [900, 500], [940, 460],
            [360, 740], [400, 700], [1040, 700], [1080, 740],
            [180, 220], [220, 260], [220, 600], [180, 640],
            [1260, 240], [1220, 280], [1220, 620], [1260, 660],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" opacity="0.75">
              <animate
                attributeName="opacity"
                values="0.35;0.9;0.35"
                dur={`${3 + (i % 4)}s`}
                begin={`${(i % 6) * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>

        {/* Subtle waveform along the middle trace */}
        <g stroke="#00C2FF" strokeOpacity="0.18" fill="none" strokeWidth="1">
          <path d="M260 460 q10 -14 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" />
        </g>
      </svg>
    </>
  );
}

/**
 * HeroChip — large semi-transparent microchip illustration for the hero
 * backdrop. Absolute-positioned inside a `relative overflow-hidden` parent.
 */
export function HeroChip({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute -right-16 -top-10 h-[120%] w-auto opacity-[0.07] ${className}`}
      viewBox="0 0 400 400"
      fill="none"
      stroke="#00C2FF"
      strokeWidth="1.2"
    >
      {/* Chip body */}
      <rect x="90" y="90" width="220" height="220" rx="14" />
      <rect x="128" y="128" width="144" height="144" rx="6" />
      <rect x="160" y="160" width="80" height="80" rx="3" />
      <text
        x="200"
        y="208"
        textAnchor="middle"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="14"
        fill="#00C2FF"
        stroke="none"
        opacity="0.55"
        letterSpacing="2"
      >
        EJ-01
      </text>

      {/* Pins */}
      <g strokeLinecap="round">
        {Array.from({ length: 9 }).map((_, i) => {
          const p = 100 + i * 25;
          return (
            <g key={i}>
              <path d={`M${p} 90 v-28`} />
              <path d={`M${p} 310 v28`} />
              <path d={`M90 ${p} h-28`} />
              <path d={`M310 ${p} h28`} />
            </g>
          );
        })}
      </g>

      {/* Corner solder marks */}
      <g fill="#00C2FF" stroke="none" opacity="0.7">
        <circle cx="90" cy="90" r="3" />
        <circle cx="310" cy="90" r="3" />
        <circle cx="90" cy="310" r="3" />
        <circle cx="310" cy="310" r="3" />
      </g>
    </svg>
  );
}
