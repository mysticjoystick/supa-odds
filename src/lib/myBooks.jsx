import { createContext, useContext, useEffect, useState } from 'react';
import { BOOKS } from './mock';

const KEY = 'oddslens-my-books';
const DEFAULT_BOOKS = ['SportyBet', 'Betway', 'betPawa'];

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw) && raw.length) return raw.filter((b) => BOOKS.includes(b));
  } catch { /* ignore */ }
  return [...DEFAULT_BOOKS];
}

const Ctx = createContext({ myBooks: DEFAULT_BOOKS, toggle: () => {}, setAll: () => {}, isMine: () => true });

export function MyBooksProvider({ children }) {
  const [myBooks, setMyBooks] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(myBooks)); } catch { /* ignore */ }
  }, [myBooks]);

  const toggle = (b) =>
    setMyBooks((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const setAll = (list) => setMyBooks(list.filter((b) => BOOKS.includes(b)));
  const isMine = (b) => myBooks.includes(b);

  return <Ctx.Provider value={{ myBooks, toggle, setAll, isMine }}>{children}</Ctx.Provider>;
}

export const useMyBooks = () => useContext(Ctx);

// Filter a book list down to the user's books. If the user deselected
// everything, fall back to the full list so the board never goes empty.
export function filterToMyBooks(books, myBooks) {
  if (!myBooks?.length) return books;
  const mine = books.filter((b) => myBooks.includes(b));
  return mine.length ? mine : books;
}
