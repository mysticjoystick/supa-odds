export default function LiveBadge({ minute, score }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/40 px-2.5 py-0.5 text-[11px] font-extrabold text-red-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        LIVE{minute ? ` • ${minute}` : ''}
      </span>
      {score && (
        <span className="tabular rounded-lg bg-white/10 px-2 py-0.5 text-xs font-extrabold text-white">
          {score.home} – {score.away}
        </span>
      )}
    </span>
  );
}
