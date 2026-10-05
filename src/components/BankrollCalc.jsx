import { useEffect, useState } from 'react';
import { suggestedStake, flatStake } from '../lib/math';
import { useBankroll } from '../lib/bankroll';

export default function BankrollCalc() {
  const { bank, setBank } = useBankroll();
  const [bankText, setBankText] = useState(String(bank));
  useEffect(() => setBankText(String(bank)), [bank]);
  const [prob, setProb] = useState(48);
  const [odds, setOdds] = useState(2.2);
  const p = prob / 100;
  const kelly = suggestedStake({ fairProb: p, market: odds, bank });
  const flat = flatStake(bank);
  return (
    <div className="sticker p-5">
      <h3 className="font-bold text-white">Bankroll calculator</h3>
      <p className="mb-4 text-xs text-slate-400">Flat 1% vs 1/4 Kelly (capped at 5%). Your bankroll is shared — deal pages suggest stakes off it. Never bet more than you can afford to lose.</p>
      <div className="grid gap-3 text-sm">
        <label className="flex min-h-[44px] items-center justify-between">Bankroll (GH₵)
          <input type="number" value={bankText}
            onChange={(e) => setBankText(e.target.value)}
            onBlur={() => setBank(bankText)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="tabular w-28 rounded-lg bg-white/10 px-2 py-2 text-white" aria-label="Your total bankroll in cedis" />
        </label>
        <label className="flex items-center justify-between">True prob (%)
          <input type="number" value={prob} onChange={(e) => setProb(+e.target.value)} className="tabular w-28 rounded-lg bg-white/10 px-2 py-1 text-white" />
        </label>
        <label className="flex items-center justify-between">Decimal odds
          <input type="number" step="0.01" value={odds} onChange={(e) => setOdds(+e.target.value)} className="tabular w-28 rounded-lg bg-white/10 px-2 py-1 text-white" />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-[11px] text-slate-400">FLAT 1%</div>
          <div className="tabular text-lg font-extrabold text-white">GH₵{flat.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-lime-400/10 p-3">
          <div className="text-[11px] text-lime-300">1/4 KELLY</div>
          <div className="tabular text-lg font-extrabold text-lime-300">GH₵{kelly.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
