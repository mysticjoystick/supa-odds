import { timeAgo } from '../lib/ratings';

// Recent headlines for these teams (ESPN, bot-cached). Links out to source.
export default function NewsPanel({ match }) {
  const items = match?.newsItems;
  if (!items?.length) {
    return (
      <div className="sticker p-6 text-center text-sm text-slate-500">
        <div className="text-lg font-bold text-slate-300">No headlines yet</div>
        <p className="mt-1 text-xs">Team news appears here as the feed picks it up.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {items.map((a, i) => {
        const body = (
          <>
            <div className="flex items-start gap-3">
              {a.image && (
                <img src={a.image} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold leading-snug text-white">{a.headline}</div>
                {!!a.description && <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{a.description}</div>}
                <div className="tabular mt-1.5 footnote">
                  {a.published ? timeAgo(a.published) : ''} · ESPN
                </div>
              </div>
            </div>
          </>
        );
        return a.url ? (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block sticker p-4 hover:border-white/25">
            {body}
          </a>
        ) : (
          <div key={i} className="sticker p-4">{body}</div>
        );
      })}
    </div>
  );
}
