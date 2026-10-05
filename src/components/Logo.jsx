const BURST =
  '32,2 37.9,9.8 47,6 48.3,15.7 58,17 54.2,26 62,32 54.2,38 58,47 48.3,48.3 47,58 37.9,54.2 32,62 26.1,54.2 17,58 15.7,48.3 6,47 9.8,38 2,32 9.8,26 6,17 15.7,15.7 17,6 26.1,9.8';

// Supa Odds badge — original starburst + ball art, Bungee wordmark.
export default function Logo({ size = 36 }) {
  const k = size / 36;
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0 drop-shadow-[0_0_12px_rgba(230,51,41,0.55)]">
        <polygon points={BURST} fill="#e63329" stroke="#1b140d" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="12.5" fill="#fffdf6" stroke="#1b140d" strokeWidth="3" />
        <polygon points="32,27.5 36.3,30.6 34.6,35.9 29.4,35.9 27.7,30.6" fill="#1b140d" />
        <g stroke="#1b140d" strokeWidth="1.8" strokeLinecap="round">
          <line x1="32" y1="27.5" x2="32" y2="22.5" />
          <line x1="36.3" y1="30.6" x2="41" y2="29.5" />
          <line x1="34.6" y1="35.9" x2="37.5" y2="40" />
          <line x1="29.4" y1="35.9" x2="26.5" y2="40" />
          <line x1="27.7" y1="30.6" x2="23" y2="29.5" />
        </g>
      </svg>
      <span className="whitespace-nowrap leading-tight">
        <span className="font-display block tracking-wide text-white" style={{ fontSize: 17 * k }}>
          SUPA <span className="text-supa">ODDS</span>
        </span>
        <span className="hidden font-medium tracking-[0.14em] text-slate-400 min-[400px]:block" style={{ fontSize: Math.max(9, 10 * k) }}>FIND VALUE • BEAT THE CLOSE</span>
      </span>
    </span>
  );
}
