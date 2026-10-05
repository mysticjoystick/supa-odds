const COLORS = {
  Pinnacle: 'bg-amber-400 text-black',
  DraftKings: 'bg-emerald-400 text-black',
  SportyBet: 'bg-red-500 text-white',
  Betway: 'bg-stone-900 text-white border border-white/25',
  betPawa: 'bg-green-600 text-white',
  Soccabet: 'bg-blue-700 text-white',
  '1xBet': 'bg-sky-500 text-black',
  '22Bet': 'bg-indigo-500 text-white',
  MSport: 'bg-blue-500 text-white',
  Melbet: 'bg-yellow-400 text-black',
  Betano: 'bg-orange-600 text-white',
  Betika: 'bg-lime-500 text-black',
};

const INITIALS = {
  SportyBet: 'S',
  DraftKings: 'DK',
  Betway: 'B',
  betPawa: 'P',
  Soccabet: 'S',
  '1xBet': '1x',
  '22Bet': '22',
  MSport: 'M',
  Melbet: 'M',
  Betano: 'B',
  Betika: 'B',
};

export default function BookBadge({ name, sharp = false }) {
  const c = COLORS[name] || 'bg-white/15 text-white';
  const initial = INITIALS[name] || name.slice(0, 1);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-extrabold ${c}`}>{initial}</span>
      <span className="font-semibold">{name}</span>
      {sharp && <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">SHARP</span>}
    </span>
  );
}
