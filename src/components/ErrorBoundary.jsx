import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="text-5xl">📡</div>
          <h1 className="mt-3 font-display text-2xl font-normal text-white">Something glitched</h1>
          <p className="mt-2 text-sm text-slate-400">
            A data hiccup broke this view — your journal and settings are safe. Try going back or reloading the snapshot.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/" className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black">Home</Link>
            <button onClick={() => window.location.reload()} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
