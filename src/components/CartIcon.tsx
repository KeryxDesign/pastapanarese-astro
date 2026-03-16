import { useState, useEffect } from 'react';
import { getItems, onCartChange } from '../stores/cart';

export default function CartIcon() {
  const base = typeof window !== 'undefined' ? (window as any).__BASE_URL__ ?? '' : '';
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getItems().reduce((s, i) => s + i.quantity, 0));
    return onCartChange(items => setCount(items.reduce((s, i) => s + i.quantity, 0)));
  }, []);

  return (
    <a href={`${base}/carrello`} className="relative flex items-center gap-1 text-earth hover:text-brand transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </a>
  );
}
