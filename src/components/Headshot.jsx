import { useState } from 'react';

// FotMob headshot with graceful initials fallback. Photos are hotlinked
// (verified image/png); anything missing renders a neutral tile instead.
export function headshotUrl(id) {
  return id ? `https://images.fotmob.com/image_resources/playerimages/${id}.png` : null;
}

export function playerInitials(name = '') {
  return String(name)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

export default function Headshot({ id, name, size = 56, className = '' }) {
  const [dead, setDead] = useState(false);
  const url = headshotUrl(id);
  if (!url || dead) {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-full bg-white/10 font-extrabold text-slate-200 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.34, border: '1px solid rgba(255,255,255,0.15)' }}
      >
        {playerInitials(name)}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      loading="lazy"
      width={size}
      height={size}
      onError={() => setDead(true)}
      className={`shrink-0 rounded-full bg-white/10 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
