// Provenance badge — REAL (ESPN fixture/score) vs SAMPLE (illustrative bundle).
export default function SampleBadge({ match }) {
  if (!match) return null;
  if (match.sample) {
    return (
      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-500" title="Illustrative prices for demoing the tools">
        SAMPLE
      </span>
    );
  }
  if (match.oddsStatus === 'needs-key') {
    return (
      <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300" title="Real fixture — full multi-book prices appear when the odds feed syncs">
        REAL FIXTURE
      </span>
    );
  }
  return (
    <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-lime-300" title="Real fixture + real odds">
      REAL
    </span>
  );
}
