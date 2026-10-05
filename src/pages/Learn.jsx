import { Link } from 'react-router-dom';

export default function Learn() {
  const cards = [
    { t: 'Expected Value (EV)', d: 'EV% = true prob × decimal − 1. Only bet +EV. Example: 48% × 2.20 − 1 = +5.6%. Over 500 bets, +EV compounds. Short term = noise.', to: '/value', cta: 'Open +EV board →' },
    { t: 'Closing Line Value (CLV)', d: 'CLV% = your odds / closing odds − 1. If you take 2.20 and it closes 2.08, CLV = +5.8%. Consistently positive CLV predicts profit better than win-rate.', to: '/tracker', cta: 'Track CLV in journal →' },
    { t: 'Line shopping', d: 'Same bet at 2.00 vs 2.20 is 10% more profit for free. Always check 2-3 books. Slow books copy Pinnacle late — beat them to it.', to: '/compare', cta: 'Compare books →' },
    { t: 'Bankroll', d: 'Flat 1-2% or 1/4 Kelly. Never chase. 100-bet losing streaks happen to sharps. If CLV is negative after 100 bets, stop and review.', to: '/tools', cta: 'Try the calculator →' },
  ];
  const steps = [
    ['Check Live first.', 'In-play games show score and momentum — never bet blind.', '/live', 'Open Live →'],
    ['Compare the board.', "Same pick at 2.00 vs 2.20 is free money left on the table.", '/compare', 'Compare →'],
    ['Read Why This Bet.', "If there's no +EV lean, the correct move is no bet.", '/value', 'Value board →'],
    ['Check the price history.', "If the line already steamed your way, the value is mostly gone.", '/history', 'History →'],
    ['Stake small and flat.', '1–2% of bankroll per pick. Never double up after a loss.', '/tools', 'Calculator →'],
    ['Log it, grade it.', 'Hit + Log, update the close later, mark won/lost/void.', '/tracker', 'Journal →'],
    ['Review monthly, not daily.', 'Judge CLV over 100+ graded bets, not yesterday.', '/performance', 'Performance →'],
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Learn — bet smarter</h1>
      <div className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.04] p-5">
        <div className="mb-2 text-xs font-bold tracking-wide text-lime-300">MATCHDAY WORKFLOW — WHAT TO DO, IN ORDER</div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          {steps.map(([b, rest, to, cta]) => (
            <li key={b}><b className="text-white">{b}</b> {rest} <Link to={to} className="ml-1 text-xs font-bold text-lime-300 hover:underline">{cta}</Link></li>
          ))}
        </ol>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.t} className="sticker p-5">
            <div className="font-bold text-white">{c.t}</div>
            <div className="mt-1 text-sm text-slate-400">{c.d}</div>
            <Link to={c.to} className="mt-3 inline-block text-xs font-bold text-lime-300 hover:underline">{c.cta}</Link>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-200">
        <b>Responsible gambling — 18+ only (Ghana).</b> This site is info/education only, no real-money wagering. No system guarantees profit. Set limits in GH₵, never chase losses, and only use books licensed by the Gaming Commission of Ghana.
        {' '}If betting stops being fun, stop and seek help — see <Link to="/responsible" className="font-bold underline">Play safe</Link>.
      </div>
    </div>
  );
}
