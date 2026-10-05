// Deep links to Ghana books — homepage + search where supported.
// We never place bets; these just open the book so the user can confirm the price.
export const BOOK_URLS = {
  SportyBet: 'https://www.sportybet.com/gh/',
  Betway: 'https://www.betway.com.gh/',
  betPawa: 'https://www.betpawa.com.gh/',
  Soccabet: 'https://www.soccabet.com/',
  MSport: 'https://www.msport.com/gh/',
  Melbet: 'https://melbet.com.gh/',
  Betano: 'https://www.betano.com.gh/',
  Betika: 'https://www.betika.com.gh/',
  '1xBet': 'https://1xbet.com.gh/',
  '22Bet': 'https://22bet.com.gh/',
  Pinnacle: 'https://www.pinnacle.com/',
  DraftKings: 'https://sportsbook.draftkings.com/',
};

export function betUrl(book) {
  return BOOK_URLS[book] || `https://www.google.com/search?q=${encodeURIComponent(`${book} Ghana betting`)}`;
}
