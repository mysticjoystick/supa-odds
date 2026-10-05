import { Link } from 'react-router-dom';
import { readEdges } from '../lib/edgeLog';
import { readArbs } from '../lib/arbLog';
import { allValueRows } from '../lib/value';
import { allArbs } from '../lib/arb';

// The feedback loop, live: every match flows
// ODDS → NORMALIZE → COMPARE → FAIR → EV → STORE → MOVES → CLOSE → CLV → RESULT → PERFORMANCE → IMPROVE.
// Counts are real (this snapshot + this device's logs), so the loop is auditable, not a diagram for show.
export default function Pipeline({ snap }) {
  const matches = snap?.matches || [];
  let edges = [];
  let arbs = [];
  try { edges = readEdges(); } catch { /* ignore */ }
  try { arbs = readArbs(); } catch { /* ignore */ }
  const liveEdges = allValueRows(matches).length;
  const liveArbs = allArbs(matches).length;
  const graded = edges.filter((e) => e.graded).length;
  const steps = [
    ['LIVE ODDS', `${matches.length} fixtures`, '/live'],
    ['NORMALIZE + COMPARE', `${snap?.books?.length || 0} books`, '/compare'],
    ['FAIR → EV', `${liveEdges} +EV live`, '/value'],
    ['STORE', `${edges.length} tracked`, '/tracker'],
    ['MOVES → CLOSE → CLV', `${graded}/${edges.length} graded`, '/history'],
    ['RESULT → PERFORMANCE', 'calibration ↓', '/performance'],
    ['ARBS', `${liveArbs} live · ${arbs.length} logged`, '/arb'],
  ];
  return (
    <div className="sticker p-4">
      <div className="mb-1 panel-title">FEEDBACK LOOP — EVERY MATCH TEACHES THE MODEL</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map(([label, sub, to], i) => (
          <span key={label} className="flex items-center gap-1.5">
            <Link to={to} className="rounded-xl bg-white/[0.04] px-2.5 py-1.5 text-center hover:bg-white/[0.08]" title={`Open ${label}`}>
              <span className="block text-[10px] font-extrabold tracking-wide text-lime-300">{label}</span>
              <span className="tabular block text-[11px] text-slate-300">{sub}</span>
            </Link>
            {i < steps.length - 1 && <span className="text-slate-400">→</span>}
          </span>
        ))}
      </div>
      <div className="mt-2 footnote">
        Bot writes snapshot + history (odds, movement). +Track stores detection (odds_at_detection, fair, EV, ts). Tracker grades close + result.
        Performance checks EV range → win rate → ROI → CLV — if higher EV doesn’t win more, the “edge” is noise and the model needs work.
      </div>
    </div>
  );
}
