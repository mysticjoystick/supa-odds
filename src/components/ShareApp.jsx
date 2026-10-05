import { useState } from 'react';

// Invite-a-friend share row — lives in the footer so every page converts.
// Uses the live origin, so it works on localhost, vercel.app, and the
// custom domain with zero config. 18+ note rides along on WhatsApp.
export default function ShareApp({ compact = false }) {
  const [copied, setCopied] = useState(false);
  let origin = '';
  try {
    origin = window.location.origin;
  } catch { /* ignore */ }
  const text = `Supa Odds — daily football tickets built from the numbers, not vibes. Check today's surest picks: ${origin}/builder`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} 18+. Play responsibly.`)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}/builder`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };
  const btn = 'inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-bold transition-colors';
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? '' : ''}`}>
      <span className="text-xs font-bold tracking-wide text-slate-400">TELL A STRIKER →</span>
      <a href={wa} target="_blank" rel="noopener noreferrer" title="Share Supa Odds on WhatsApp"
        className={`${btn} border border-[#25D366]/50 text-[#4ce080] hover:bg-[#25D366]/10`}>
        WhatsApp
      </a>
      <a href={x} target="_blank" rel="noopener noreferrer" title="Share Supa Odds on X"
        className={`${btn} bg-white/10 text-white hover:bg-white/15`}>
        𝕏 Post
      </a>
      <button onClick={copy} title="Copy your invite link"
        className={`${btn} bg-white/10 text-white hover:bg-white/15`}>
        {copied ? '✓ Copied!' : 'Copy invite link'}
      </button>
    </div>
  );
}
