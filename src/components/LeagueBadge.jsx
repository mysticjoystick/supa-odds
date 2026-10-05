const COLORS = {
  epl: 'from-violet-500 to-fuchsia-500',
  laliga: 'from-orange-500 to-red-500',
  nba: 'from-orange-400 to-amber-600',
  nfl: 'from-emerald-500 to-teal-600',
  seriea: 'from-sky-500 to-blue-700',
  bundes: 'from-red-500 to-rose-700',
  ucl: 'from-indigo-500 to-purple-700',
  ligue1: 'from-blue-600 to-cyan-500',
  championship: 'from-slate-500 to-slate-700',
  eredivisie: 'from-orange-500 to-red-600',
  gpl: 'from-yellow-400 via-amber-500 to-green-600',
  brazil: 'from-green-500 to-yellow-500',
};

const SHORT = {
  epl: 'EPL',
  laliga: 'LAL',
  nba: 'NBA',
  nfl: 'NFL',
  seriea: 'SA',
  bundes: 'BL',
  ucl: 'UCL',
  ligue1: 'L1',
  championship: 'CHA',
  eredivisie: 'ERE',
  gpl: 'GPL',
  brazil: 'BRA',
};

export default function LeagueBadge({ id, name, size = 'md' }) {
  const grad = COLORS[id] || 'from-slate-500 to-slate-700';
  const short = SHORT[id] || (name || id).slice(0, 3).toUpperCase();
  const box = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';
  return (
    <span className="flex items-center gap-2">
      <span className={`grid ${box} place-items-center rounded-lg bg-gradient-to-br ${grad} font-extrabold text-white shadow-lg`}>
        {short}
      </span>
      {size !== 'sm' && <span className="font-semibold">{name || id}</span>}
    </span>
  );
}
