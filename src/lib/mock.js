// Reference lists only — league/book names for labels. NO sample matches, NO sample
// tips: every row on screen is a real ESPN fixture or the user's own journal.

export const LEAGUES = [
  { id: 'epl', name: 'Premier League', sport: 'Soccer', tier: 1 },
  { id: 'laliga', name: 'La Liga', sport: 'Soccer', tier: 2 },
  { id: 'nba', name: 'NBA', sport: 'Basketball', tier: 1 },
  { id: 'nfl', name: 'NFL', sport: 'American Football', tier: 1 },
  { id: 'seriea', name: 'Serie A', sport: 'Soccer', tier: 2 },
  { id: 'bundes', name: 'Bundesliga', sport: 'Soccer', tier: 3 },
  { id: 'ucl', name: 'Champions League', sport: 'Soccer', tier: 2 },
  { id: 'ligue1', name: 'Ligue 1', sport: 'Soccer', tier: 3 },
  { id: 'championship', name: 'Championship', sport: 'Soccer', tier: 3 },
  { id: 'eredivisie', name: 'Eredivisie', sport: 'Soccer', tier: 3 },
  { id: 'brazil', name: 'Brazil Série A', sport: 'Soccer', tier: 3 },
  { id: 'gpl', name: 'Ghana Premier League', sport: 'Soccer', tier: 2 },
];

export const BOOKS = ['Pinnacle', 'DraftKings', 'SportyBet', 'Betway', 'betPawa', 'Soccabet', '1xBet', '22Bet', 'MSport', 'Melbet', 'Betano', 'Betika'];

// Intentionally empty — removed per user request. Real fixtures arrive via
// bot/fetchOdds.js (ESPN, no key) into public/snapshot.json.
export const MATCHES = [];

// Intentionally empty — removed per user request. Calibration and Performance
// fill up as you grade your own journal rows in Tracker.
export const TIPS = [];
