import { useEffect, useState } from 'react';
import { teamGradient, setCachedTeamColor, extractDominantColor, isKnownTeam, toInk } from '../lib/teamColor';

// Team crest — prefers an embedded badge URL (bot writes ESPN logos into the
// snapshot, so this is instant and CORS-clean), then any previously cached
// URL, then a colourful initials tile in the club's own colours.
// No runtime badge search: the old live API is CORS-blocked in browsers and
// only produced console spam.

export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
}

const badgeKey = (name) => `oddslens-badge-${String(name).toLowerCase()}`;

function readBadgeCache(name) {
  try {
    return localStorage.getItem(badgeKey(name)) || null;
  } catch {
    return null;
  }
}

function cacheColorFromLogo(name, logoUrl) {
  if (!logoUrl || isKnownTeam(name)) return; // curated pair already covers it
  extractDominantColor(logoUrl).then((raw) => {
    if (raw) setCachedTeamColor(name, toInk(raw));
  }).catch(() => {});
}

export default function TeamCrest({ name, size = 32, src }) {
  const [dead, setDead] = useState(null); // URL that failed to load
  const url = src || readBadgeCache(name);

  // Remember embedded URLs for later visits (offline-friendly, instant).
  useEffect(() => {
    if (!src) return;
    try {
      if (localStorage.getItem(badgeKey(name)) !== src) {
        localStorage.setItem(badgeKey(name), src);
      }
    } catch { /* ignore */ }
  }, [name, src]);

  if (url && url !== dead) {
    return (
      <img
        src={url}
        alt={`${name} logo`}
        title={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setDead(url)}
        onLoad={() => cacheColorFromLogo(name, url)}
        className="shrink-0 rounded-full bg-white/10 object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    );
  }

  const [c1, c2] = teamGradient(name);
  return (
    <span
      title={name}
      className="grid shrink-0 place-items-center rounded-xl font-extrabold text-white shadow-lg"
      style={{
        width: size, height: size, fontSize: size * 0.32,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      {initials(name)}
    </span>
  );
}
