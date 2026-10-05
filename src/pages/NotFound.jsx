import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="text-6xl font-extrabold text-white/10">404</div>
      <h1 className="mt-2 font-display text-2xl font-normal text-white">Offside — page not found</h1>
      <p className="mt-2 text-sm text-slate-400">That route doesn't exist. Search a team or jump back in:</p>
      <div className="mx-auto mt-4 flex max-w-xs justify-center">
        <SearchBar onNav={() => {}} />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">← Back</button>
        <Link to="/" className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black">Today</Link>
        <Link to="/live" className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white">● Live</Link>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        <Link to="/compare" className="text-slate-400 hover:text-white">Compare</Link>
        <span className="text-slate-300">•</span>
        <Link to="/tools" className="text-slate-400 hover:text-white">Tools</Link>
        <span className="text-slate-300">•</span>
        <Link to="/tracker" className="text-slate-400 hover:text-white">Tracker</Link>
        <span className="text-slate-300">•</span>
        <Link to="/learn" className="text-slate-400 hover:text-white">Learn</Link>
      </div>
    </div>
  );
}
